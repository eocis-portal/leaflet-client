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

import copy
import os
import logging
import zipfile
import json

from .store import Store
from .job_operations import JobOperations
from .data_schema import DataSchema
from .task import Task
from .config import Config

class JobManager:
    """Perform various job management tasks"""

    def __init__(self, store:Store):
        """
        Create a job manager
        :param store: the persistent store
        """
        self.store = store
        self.logger = logging.getLogger("JobManager")



    def create_tasks(self, job_id:str, data_configuration_path:str):
        """
        Create one or more tasks that need to be executed for a given job

        :param job_id: the id of the job in the persistent store
        :param data_configuration_path
        """
        self.logger.info(f"Creating tasks for job {job_id}")
        with JobOperations(self.store) as jo:
            job = jo.get_job(job_id)
            job_spec = job.get_spec()
            start_year = int(job_spec["START_YEAR"])
            end_year = int(job_spec["END_YEAR"])
            bundle_id = job_spec["BUNDLE_ID"]

            # get a list of (dataset_id, variable_id) tuples
            variables = list(map(lambda v: tuple(v.split(":")), job_spec["VARIABLES"]))
            dataset_ids = set()
            output_path = os.path.join(Config.OUTPUT_PATH,job_id)
            os.makedirs(output_path, exist_ok=True)

            for (dataset_id, variable_id) in variables:
                dataset_ids.add(dataset_id)

            data_spec = {}

            for task_dataset_id in dataset_ids:
                dataset_variables = []
                for (dataset_id, variable_id) in variables:
                    if dataset_id == task_dataset_id:
                        dataset_variables.append(variable_id)
                data_spec[task_dataset_id] = dataset_variables

            data_spec_path = os.path.join(output_path,"datasets.json")
            with open(data_spec_path,"w") as f:
                f.write(json.dumps(data_spec))

            # create a task to compute the results for each year that the job includes
            for year in range(start_year, end_year+1):
                # build a specification for this task
                task_spec = copy.deepcopy(job_spec)
                # if not the first year in the job, include data from January 1st
                if year > start_year:
                    task_spec["START_MONTH"] = "1"
                    task_spec["START_DAY"] = "1"
                # if not the last year in the job, include data up to December 31st
                if year < end_year:
                    task_spec["END_MONTH"] = "12"
                    task_spec["END_DAY"] = "31"

                task_spec["CONDA_PATH"] = Config.CONDA_PATH
                task_spec["DATA_SPEC_PATH"] = data_spec_path

                task_spec["OUT_PATH"] = os.path.join(output_path, str(year))
                task_spec["START_YEAR"] = task_spec["END_YEAR"] = str(year)
                task_spec["OUTPUT_FORMAT"] = job_spec["OUTPUT_FORMAT"]

                if "Y_MIN" in job_spec:
                    task_spec["Y_MIN"] = job_spec["Y_MIN"]
                if "Y_MAX" in job_spec:
                    task_spec["Y_MAX"] = job_spec["Y_MAX"]
                if "X_MIN" in job_spec:
                    task_spec["X_MIN"] = job_spec["X_MIN"]
                if "X_MAX" in job_spec:
                    task_spec["X_MAX"] = job_spec["X_MAX"]

                # create a new task
                task = Task.create(task_spec,job_id)
                # persist it
                jo.create_task(task)
                # queue for execution
                jo.queue_task(job_id, task.get_task_name())
                self.logger.info(f"Created task {task.get_task_name()} for job {job_id}")

    def zip_results(self, task:Task) -> str:
        """
        When a task is complete, zip up the output files

        :param task: the completed task
        :return: the path of the created zip file
        """
        output_path = os.path.join(Config.OUTPUT_PATH, task.get_job_id())
        year = task.spec["END_YEAR"]
        zip_path = os.path.join(output_path,year+".zip")
        task_out_path = task.spec["OUT_PATH"]
        with zipfile.ZipFile(zip_path, 'w') as outz:
            for file_name in os.listdir(task_out_path):
                file_path = os.path.join(task_out_path,file_name)
                outz.write(file_path, file_name)
                os.remove(file_path)
            os.rmdir(task_out_path)
        return zip_path

    def update_job(self, job_id:str):
        """
        When a task has been completed or failed, update the job's status if there are no remaining tasks
        :param job_id: the ID of the job to update

        TODO need some logic to unqueue all remaining queued tasks if even one task has failed
        """
        with JobOperations(self.store) as jo:
            new_running_count = jo.count_tasks_by_state([Task.STATE_NEW, Task.STATE_RUNNING], job_id=job_id)
            self.logger.info(f"Job {job_id} has {new_running_count} active tasks")
            job = jo.get_job(job_id)
            if new_running_count == 0:
                failed_count = jo.count_tasks_by_state([Task.STATE_FAILED], job_id=job_id)
                if failed_count == 0:
                    job.set_completed()
                    self.logger.info(f"Job {job_id} completed")
                else:
                    job.set_failed(f"{failed_count} tasks failed")
                    self.logger.info(f"Job {job_id} failed with {failed_count} failed tasks")
            else:
                job.set_running()
            jo.update_job(job)

