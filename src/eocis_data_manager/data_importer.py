import logging
import os.path
import queue
import shutil
import threading
import uuid
import time

import xarray as xr

class ImportWorker(threading.Thread):

    def __init__(self, queue, variables):
        super().__init__()
        self.queue = queue
        self.variables = variables

    def run(self):
        while True:
            job = self.queue.get()
            if job is None:
                break
            else:
                self.process(job)

    def process(self, job):
        (ds,variables,selector,path) = job
        if not os.path.exists(path):
            while True:
                try:
                    ds_chunk = ds[variables].isel(**selector).load()
                    break
                except Exception as ex:
                    print(ex)

            encoding = { v:{"zlib": True, "complevel": 5, "dtype": "float32"} for v in self.variables }
            ds_chunk.to_netcdf(path, encoding=encoding)

class DataImporter:

    def __init__(self, ds, variables, x_dimension="lon", y_dimension="lat", x_coord="lon", y_coord="lat", nr_workers=4, chunk_multiple=2, folder="."):
        self.ds = ds
        self.variables = variables
        self.logger = logging.getLogger("importer")

        self.tmpfolder = os.path.join(folder,str(uuid.uuid4()))
        os.makedirs(self.tmpfolder)

        self.download_queue = queue.Queue()
        self.threads = []
        self.x_dimension = x_dimension
        self.y_dimension = y_dimension
        self.x_coord = x_coord
        self.y_coord = y_coord
        self.nr_workers = nr_workers
        self.chunk_multiple = chunk_multiple

        for i in range(0,nr_workers):
            iw = ImportWorker(self.download_queue, self.variables)
            iw.start()
            self.threads.append(iw)

    def import_dataset(self):
        self.logger.info(f"Downloading data for {','.join(self.variables)}")

        start_time = time.time()
        y_chunks = self.ds.chunksizes[self.y_dimension]
        x_chunks = self.ds.chunksizes[self.x_dimension]
        y_chunk_size = y_chunks[0]
        x_chunk_size = x_chunks[0]
        ny = len(self.ds[self.y_coord])
        nx = len(self.ds[self.x_coord])

        y_chunk_r = y_chunk_size * self.chunk_multiple
        x_chunk_r = x_chunk_size * self.chunk_multiple
        paths = []
        y_off = 0
        while y_off < ny:
            x_off = 0
            x_paths = []
            y_range = range(y_off, min(ny, y_off + y_chunk_r))
            while x_off < nx:
                x_range = range(x_off,min(nx,x_off+x_chunk_r))
                path = os.path.join(self.tmpfolder,f"chunk_{y_off}_{x_off}.nc")
                self.download_queue.put((self.ds, self.variables, {self.y_dimension:y_range,self.x_dimension:x_range},path))
                x_paths.append(path)
                x_off += x_chunk_r
            paths.append(x_paths)
            y_off += y_chunk_r

        for i in range(0, self.nr_workers):
            self.download_queue.put(None)

        for i in range(0, self.nr_workers):
            self.threads[i].join()

        end_time = time.time()

        elapsed_time =int(end_time-start_time)
        self.logger.info(f"Download complete (elapsed time {elapsed_time}s)")

        ds = xr.open_mfdataset(paths,engine="netcdf4",concat_dim=[self.y_dimension,self.x_dimension], combine="nested")
        return ds

    def close(self):
        self.logger.info(f"Closing and removing temporary files in {self.tmpfolder}")
        shutil.rmtree(self.tmpfolder)