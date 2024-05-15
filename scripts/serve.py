from http.server import SimpleHTTPRequestHandler, HTTPServer
import os.path
import argparse

webroot = os.path.join(os.path.split(__file__)[0],"..")

class CORSRequestHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=webroot, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super(CORSRequestHandler, self).end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--host",default="0.0.0.0")
    parser.add_argument("--port",type=int, default=8888)
    args = parser.parse_args()
    server = HTTPServer((args.host,args.port),CORSRequestHandler)
    print("Serving files at http://%s:%d/static/index.html"%(args.host,args.port))
    server.serve_forever()