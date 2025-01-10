import argparse
import datetime
import os
import json
import logging

from eocis_wms_service.cli.app import DataLoader

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-date", default="2022-01-01")
    parser.add_argument("--end-date", default="2022-01-03")
    parser.add_argument("--layer-name", default="analysed_sst")

    args = parser.parse_args()
    cache_path = os.path.join(os.path.split(__file__)[0],"..","cli","config.json")

    start_date = datetime.datetime.strptime(args.start_date,"%Y-%m-%d")
    end_date = datetime.datetime.strptime(args.end_date,"%Y-%m-%d")

    with open(cache_path) as f:
        config = json.loads(f.read())

    cache_folder = config["cache_folder"]
    os.makedirs(cache_folder, exist_ok=True)

    logging.basicConfig(level=logging.INFO)
    loader = DataLoader(cache_folder,config["subsets"])

    logger = logging.getLogger("load_cache")

    dt = start_date
    while dt <= end_date:
        logger.info(f"Processing {dt}")
        loader.get_dataarray(args.layer_name,dt)
        dt += datetime.timedelta(days=1)

if __name__ == '__main__':
    main()