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

from typing import Union

class ListBuilder:

    def __init__(self):
        self.items = []

    def add(self, item:Union[str,"ListBuilder"]):
        self.items.append(item)

    def emit(self, indent):
        s = " "*indent + "<ul>"
        for item in self.items:
            s += " "*indent

            if isinstance(item,str):
                s += "<li>"
                s += item
                s += "</li>\n"
            else:
                s += "\n"
                s += item.emit(indent+4)
                s += " "*indent
                s += "</li>\n"
        return s


def get_html_description(job):

        """
        Return a summary of the job spec.
        """
        spec = job.get_spec()
        lb = ListBuilder()
        lb.add("Variables")
        vl = ListBuilder()
        for variable in spec["VARIABLES"]:
            vl.add(variable)
        lb.add(vl)
        return lb.emit(0)
