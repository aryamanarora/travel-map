import geocoder
import json

with open('cache.json', 'r') as fin:
    cache = json.load(fin)

with open('data.json', 'r') as fin:
    data = json.load(fin)

for person in data['people']:
    for location in data['people'][person]:
        if isinstance(location, str):
            for location in data['trips'][location]:
                location = location[0]
                if location not in cache:
                    print(location)
                    coords = geocoder.geonames(location, key='aryaman')
                    cache[location] = [coords.lat, coords.lng]
        else:
            location = location[0]
            if location not in cache:
                print(location)
                coords = geocoder.geonames(location, key='aryaman')
                print(coords)
                cache[location] = [coords.lat, coords.lng]

with open('cache.json', 'w') as fout:
    json.dump(cache, fout, indent=4)
