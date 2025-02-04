#!/bin/bash

eval "$($CONDA_PATH 'shell.bash' 'hook' 2> /dev/null)"

conda activate datashader_env

export PYTHONPATH=`dirname $0`/../..

python -u -m eocis_data_processor.tools.regridder.regridder --data-spec-path $DATA_SPEC_PATH \
  --out-path $OUT_PATH --output-format $OUTPUT_FORMAT $BOUNDS \
  --start-year $START_YEAR --start-month $START_MONTH --start-day $START_DAY \
  --end-year $END_YEAR --end-month $END_MONTH --end-day $END_DAY
