# -*- coding: utf-8 -*-

# MIT License
#
# Copyright (C) 2023-2025 National Centre For Earth Observation (NCEO)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software
# and associated documentation files (the "Software"), to deal in the Software without
# restriction, including without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all copies or
# substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import threading
import time
import logging

from eocis_data_manager.store import Store
from eocis_data_manager.job_operations import JobOperations
from eocis_data_manager.job_manager import JobManager

from .task_runner import TaskRunner

class Daemon(threading.Thread):

    daemons = {}

    def __init__(self, id, store, queue_poll_interval=2, max_retries=2):
        super().__init__()
        self.id = id
        self.store = store
        self.queue_poll_interval = queue_poll_interval
        self.max_retries = max_retries
        self.logger = logging.getLogger(f"daemon{self.id}")
        self.job_manager = JobManager(self.store)

    @staticmethod
    def start_daemons(store,nr_threads=2):
        for thread_nr in range(nr_threads):
            id = f"daemon{thread_nr}"
            daemon = Daemon(id,store)
            Daemon.daemons[id] = daemon
            daemon.start()

    def run(self):
        while True:
            time.sleep(self.queue_poll_interval)

            with JobOperations(self.store) as jo:
                task = jo.get_next_task()
                ran_ok = False
                if task:
                    task.set_running()
                    jo.update_task(task)
                    self.job_manager.update_job(task.get_job_id())
                    ran_ok = self.run_task(task, jo)

            if ran_ok:
                self.job_manager.zip_results(task)

            if task:
                self.job_manager.update_job(task.get_job_id())

    def run_task(self,task, jo):
        self.logger.info(f"Running task: {task.get_task_name()} in job: {task.get_job_id()}")
        ts = TaskRunner()
        ok = ts.run(task)
        self.logger.info(f"Completed task (success:{ok}): {task.get_task_name()} in job: {task.get_job_id()}")

        if ok:
            task.set_completed()
            jo.update_task(task)
            return True
        else:
            retry_count = task.get_retry_count()
            if retry_count < self.max_retries:
                task.retry()
                jo.queue_task(task.get_job_id(), task.get_task_name())
            else:
                task.set_failed("Unknown error")
            jo.update_task(task)
            return False

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--nr-threads", type=int, default=1)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    store = Store()
    Daemon.start_daemons(store, nr_threads=args.nr_threads)

if __name__ == '__main__':
    main()



