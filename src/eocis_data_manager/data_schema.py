import json
import datetime
import math
import copy
from pystac_client import Client
from eocis_data_manager.data_loader import DataLoader

from .bundle import Bundle
from .dataset import DataSet, Variable

class DataSchema:

    def __init__(self, configuration_path:str="config.json"):
        self.configuration_path = configuration_path

        with open(configuration_path) as f:
            self.config = json.loads(f.read())

        self.bundles = {}
        bundle_config = self.config["bundles"]
        for bundle_id in bundle_config:
            b = Bundle(bundle_id=bundle_id,
                       bundle_name=bundle_config[bundle_id]["name"],
                       spec=bundle_config[bundle_id]["spec"],
                       dataset_ids=bundle_config[bundle_id]["datasets"])
            self.bundles[bundle_id] = b

        self.datasets = {}
        dataset_config = self.config["datasets"]
        for dataset_id in dataset_config:

            dscfg = copy.deepcopy(dataset_config[dataset_id])
            if "defaults" in dscfg:
                dscfg.update(**self.config["defaults"][dscfg["defaults"]])

            variables = []
            for variable_id in dscfg["variables"]:
                vcfg = dscfg["variables"][variable_id]
                v = Variable(variable_id=variable_id, variable_name=vcfg["name"],
                             short_description=vcfg.get("short_description",""),
                             long_description=vcfg.get("long_description", ""),
                             climatology_path=vcfg.get("climatology_path",""),
                             based_on_variable=vcfg.get("based_on_variable",""))
                variables.append(v)

            start_date=datetime.datetime.strptime(dscfg["start_date"],"%Y-%m-%d").replace(tzinfo=None).date() if "start_date" in dscfg else None
            end_date=datetime.datetime.strptime(dscfg["end_date"],"%Y-%m-%d").replace(tzinfo=None).date() if "end_date" in dscfg else None
            license = dscfg.get("license",None)
            citation = dscfg.get("citation", None)

            d = DataSet(dataset_id=dataset_id,
                    dataset_name=dscfg.get("name",""),
                    short_description=dscfg.get("short_description",""),
                    long_description=dscfg.get("long_description", ""),
                    temporal_resolution=dscfg.get("temporal_resolution",None),
                    spatial_resolution=dscfg.get("spatial_resolution",None),
                    start_date=start_date,
                    end_date=end_date,
                    variables=variables,
                    collection=dscfg.get("collection",""),
                    path = dscfg.get("path", ""),
                    x_min=dscfg.get("x_min",0),
                    x_max=dscfg.get("x_max",0),
                    y_min=dscfg.get("y_min",0),
                    y_max=dscfg.get("y_max",0),
                    license=license,
                    citation=citation,
                    enabled=True)

            self.datasets[dataset_id] = d

    def get_bundles(self):
        return list(self.bundles.values())

    def get_bundle(self, bundle_id):
        return self.bundles[bundle_id]

    def get_datasets(self):
        return list(self.datasets.values())

    def get_dataset(self, dataset_id):
        dataset = self.datasets[dataset_id]

        if dataset.start_date is None or dataset.end_date is None or dataset.license is None \
                or dataset.citation is None:

            if dataset.collection:

                # augument the dataset with information from the stac collection
                client = Client.open("https://api.stac.ceda.ac.uk")
                collection = client.get_collection(dataset.collection)

                if dataset.start_date is None:
                    dataset.start_date = collection.extent.temporal.intervals[0][0].replace(tzinfo=None)

                if dataset.end_date is None:
                    dataset.end_date = collection.extent.temporal.intervals[-1][1].replace(tzinfo=None)

                if dataset.license is None:
                    dataset.license = collection.license

                if dataset.citation is None:
                    dataset.citation = collection.extra_fields.get("sci:citation")

        return dataset

    def dump(self):
        pass

    def get_configuration_path(self):
        return self.configuration_path

    def compute_size(self, job):

        """
        Get the size in pixels of a proposed job
        """

        pixel_count = 0

        job_spec = job.get_spec()

        start_dt = datetime.datetime(job_spec["START_YEAR"], job_spec["START_MONTH"], job_spec["START_DAY"], 0, 0, 0).replace(tzinfo=None)
        end_dt = datetime.datetime(job_spec["END_YEAR"], job_spec["END_MONTH"], job_spec["END_DAY"], 23, 59, 59).replace(tzinfo=None)

        # get a list of (dataset_id, variable_id) tuples
        variables = list(map(lambda v: tuple(v.split(":")), job_spec["VARIABLES"]))
        dataset_ids = set()

        for (dataset_id, variable_id) in variables:
            dataset_ids.add(dataset_id)

        for task_dataset_id in dataset_ids:
            dataset_variables = []
            for (dataset_id, variable_id) in variables:
                if dataset_id == task_dataset_id:
                    dataset_variables.append(variable_id)
            dataset = self.get_dataset(task_dataset_id)
            spatial_resolution = dataset.spatial_resolution
            dataset_start_date = dataset.start_date
            dataset_end_date = dataset.end_date
            if dataset_end_date < start_dt or dataset_start_date > end_dt:
                # no overlap
                continue

            if dataset_start_date < start_dt:
                dataset_start_date = start_dt
            if dataset_end_date > end_dt:
                dataset_end_date = end_dt

            ymin = job_spec["Y_MIN"] if "Y_MIN" in job_spec else dataset.y_min
            ymax = job_spec["Y_MAX"] if "Y_MAX" in job_spec else dataset.y_max
            xmin = job_spec["X_MIN"] if "X_MIN" in job_spec else dataset.x_min
            xmax = job_spec["X_MAX"] if "X_MAX" in job_spec else dataset.x_max

            xs = int((xmax-xmin)/spatial_resolution)
            ys = int((ymax-ymin)/spatial_resolution)
            interval_days = math.ceil((dataset_end_date - dataset_start_date).total_seconds()/86400)
            pixel_count += xs * ys * interval_days * len(dataset_variables)

        return pixel_count