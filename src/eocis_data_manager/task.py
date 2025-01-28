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

"""
The task module deals with the representation of a generic task, a smaller unit of work which forms part of a larger logical job.

A task is uniquely identified by a parent job and a unique task name within the job.  It is described by a JSON serialisable specification object, usually a dictionary.

The task object records the task state (NEW, RUNNING, COMPLETED, FAILED), a remote task ID (relevant to RUNNING tasks), an error message (relevant to FAILED tasks), and its submission and completion times.

Methods setRunning, setCompleted, setFailed and retry are used to move a task between states.

Tasks can be retried if they fail, and so also have an associated retry count.
"""
import uuid


from .utils import Utils

class Task:
    """
    Represent a task - a discrete executable piece of work that contributes towards the completion of a job
    """

    def __init__(self,job_id,task_name=None,spec=None):
        self.job_id = job_id
        self.task_name = task_name or str(uuid.uuid4())
        self.spec = spec
        self.state = Task.STATE_NEW
        self.error = ""
        self.submission_date_time = None
        self.completion_date_time = None
        self.retrycount = 0

    def set_running(self):
        """Move this task into the RUNNING state, noting the current UTC date/time as its submission date"""
        self.set_state(Task.STATE_RUNNING).set_submission_datetime(Utils.local_now())
        return self

    def set_completed(self):
        """Move this task into the COMPLETED state, noting the current UTC date/time as its completed date"""
        self.set_state(Task.STATE_COMPLETED).set_completion_datetime(Utils.local_now())
        return self

    def set_failed(self, error=""):
        """Move this task into the FAILED state, noting the error and the current UTC date/time as its completed date"""
        self.set_state(Task.STATE_FAILED).set_completion_datetime(Utils.local_now()).set_error(error)
        return self

    def retry(self):
        """Move this task into the NEW state, incrementing the retry count and removing any associated submission/completion dates and error message"""
        self.set_state(Task.STATE_NEW).set_completion_datetime(None).set_submission_datetime(None).set_retry_count(self.get_retry_count() + 1).set_error("")

    def get_job_id(self):
        return self.job_id

    def get_task_name(self):
        return self.task_name

    def set_task_name(self, new_task_name):
        self.task_name = new_task_name
        return self

    def get_error(self):
        return self.error

    def set_error(self, error):
        self.error = error
        return self

    def get_retry_count(self):
        return self.retrycount

    def set_retry_count(self, retrycount):
        self.retrycount = retrycount
        return self

    def get_spec(self):
        return self.spec

    def get_submission_datetime(self):
        return self.submission_date_time

    def set_submission_datetime(self, submission_date_time=None):
        self.submission_date_time = submission_date_time
        return self

    def get_completion_datetime(self):
        return self.completion_date_time

    def set_completion_datetime(self, completion_date_time=None):
        self.completion_date_time = completion_date_time
        return self

    def get_state(self):
        return self.state

    def set_state(self, state):
        self.state = state
        return self

    def get_duration_hours(self):
        if self.state == Task.STATE_NEW:
            return 0
        if self.state == Task.STATE_RUNNING:
            if self.get_submission_datetime() is not None:
                return (Utils.local_now() - self.get_submission_datetime()).total_seconds() / 3600
            else:
                return 0
        return (self.get_completion_datetime() - self.get_submission_datetime()).total_seconds() / 3600


    def __repr__(self):
        status = self.get_state()
        status_msg = status
        if status == Task.STATE_RUNNING:
            rcount = self.get_retry_count()
            status_msg += "(try=%d)"%rcount
        if status == Task.STATE_FAILED:
            status_msg += "(%s)"%(self.get_error())
        return "%s %s %0.2f hours"%(self.get_task_name(), status_msg, self.get_duration_hours())

    STATE_NEW = "NEW"
    STATE_RUNNING = "RUNNING"
    STATE_COMPLETED = "COMPLETED"
    STATE_FAILED = "FAILED"

    @staticmethod
    def getAllStates():
        return [Task.STATE_NEW,Task.STATE_RUNNING,Task.STATE_COMPLETED,Task.STATE_FAILED]

    @staticmethod
    def create(spec, job_id, task_name=None):
        return Task(job_id=job_id, task_name=task_name,spec=spec)