import os

class Config:

    HOST = "localhost"
    PORT = 9019

    DATA_CONFIGURATION_PATH = os.path.join(os.path.split(__file__)[0], "..", "..", "eocis_data_provider", "config.json")