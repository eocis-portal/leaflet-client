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

import os
from .process_runner import ProcessRunner
from eocis_data_manager.task import Task
import json

thisdir = os.path.split(__file__)[0]


class TaskRunner:
    """
    Manage the execution of a task in a sub-process
    """

    def __init__(self):
        pass

    def run(self, task:Task) -> bool:
        """
        Run the task in a sub-process
        :param task: task to run
        :return: True iff the task succeeded
        """
        name = task.get_task_name()
        config_path = task.get_spec()["CONFIG_PATH"]
        with open(config_path) as f:
            config = json.loads(f.read())
        conda_path = config["conda_path"]

        env = {
            "CONDA_PATH": conda_path,
            "OUT_PATH": "/tmp"
        }

        bounds = ""
        for (k,v) in task.get_spec().items():
            if k == "X_MIN":
                bounds += f"--x-min {v} "
            elif k == "X_MAX":
                bounds += f"--x-max {v} "
            elif k == "Y_MIN":
                bounds += f"--y-min {v} "
            elif k == "Y_MAX":
                bounds += f"--y-max {v} "
            else:
                if isinstance(v,list):
                    v= ",".join(v)
                elif isinstance(v,int) or isinstance(v,float):
                    v = str(v)
                env[k] = v

        if bounds:
            env["BOUNDS"] = bounds

        script = os.path.join(thisdir,"task_runner.sh")
        cmd = script
        pr = ProcessRunner(cmd, name=name, env_vars=env)
        (retcode, timedout) = pr.run()
        return retcode == 0 and not timedout



