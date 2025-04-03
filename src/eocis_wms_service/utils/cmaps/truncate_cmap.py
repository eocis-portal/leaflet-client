
import matplotlib.pylab as plt

import matplotlib.colors as colors

import numpy as np
import json

# Redefine the colormap to remove the darkest blues
def truncate_colormap(cmap, minval=0.0, maxval=1.0, n=256):
    new_cmap = colors.LinearSegmentedColormap.from_list(
        'trunc({n},{a:.2f},{b:.2f})'.format(n=cmap.name, a=minval, b=maxval),
        cmap(np.linspace(minval, maxval, n)))
    return new_cmap

cmap = plt.get_cmap('jet')

new_cmap = truncate_colormap(cmap, 0.15, 1.0)

colors = np.around(cmap(np.linspace(0, 1, cmap.N))[:, 0:3], 4)

colormap = {
        "interpolate": cmap.N >= 256,
        "colors": colors.tolist(),
}

with open("jet_aerosol.json","w") as f:
    f.write(json.dumps(colors.tolist()))

