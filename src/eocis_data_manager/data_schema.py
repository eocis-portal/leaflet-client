import json
import datetime
from eocis_data_provider.data_loader import DataLoader

from .bundle import Bundle
from .dataset import DataSet, Variable

class DataSchema:

    def __init__(self, configuration_path:str="config.json"):
        self.configuration_path = configuration_path
        with open(configuration_path) as f:
            config = json.loads(f.read())
        self.data_loader = DataLoader(dataset_config=config["datasets"], bundle_config=config["bundles"])
        self.data_loader.load()
        self.bundles = {}
        bundle_config = self.data_loader.get_bundle_config()
        for bundle_id in bundle_config:
            b = Bundle(bundle_id=bundle_id,
                       bundle_name=bundle_config[bundle_id]["name"],
                       spec=bundle_config[bundle_id]["spec"],
                       dataset_ids=bundle_config[bundle_id]["datasets"])
            self.bundles[bundle_id] = b
        self.datasets = {}
        dataset_config = self.data_loader.get_dataset_config()
        for dataset_id in dataset_config:
            dscfg = dataset_config[dataset_id]
            variables = []
            for variable_id in dscfg["variables"]:
                vcfg = dscfg["variables"][variable_id]
                v = Variable(variable_id=variable_id, variable_name=vcfg["name"], spec=vcfg.get("spec",{}))
                variables.append(v)

            d = DataSet(dataset_id=dataset_id,
                    dataset_name=dscfg.get("name",""),
                    spec=dscfg.get("spec",{}),
                    temporal_resolution=dscfg.get("temporal_resolution",""),
                    spatial_resolution=dscfg.get("spatial_resolution",""),
                    start_date=datetime.datetime.strptime(dscfg["start_date"],"%Y-%m-%d").date() if "start_date" in dscfg else None,
                    end_date=datetime.datetime.strptime(dscfg["end_date"],"%Y-%m-%d").date() if "end_date" in dscfg else None,
                    variables=variables,
                    collection=dscfg.get("collection",""),
                    enabled=True)

            self.datasets[dataset_id] = d

    def get_bundles(self):
        return list(self.bundles.values())

    def get_bundle(self, bundle_id):
        return self.bundles[bundle_id]

    def get_datasets(self):
        return list(self.datasets.values())

    def get_dataset(self, dataset_id):
        return self.datasets[dataset_id]

    def dump(self):
        pass

    def get_configuration_path(self):
        return self.configuration_path