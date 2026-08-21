import json

with open('gifts_prices.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('gifts_prices.txt', 'w', encoding='utf-8') as f:
    f.write('LISTA DE PRECIOS DE REGALOS TIKTOK LIVE\n')
    f.write('='*60 + '\n\n')
    f.write('Total de imagenes: ' + str(len(data)) + '\n')
    con_precio = sum(1 for r in data if r['price'] is not None)
    sin_precio = sum(1 for r in data if r['price'] is None)
    f.write('Con precio encontrado: ' + str(con_precio) + '\n')
    f.write('Sin precio (personalizados/no listados): ' + str(sin_precio) + '\n\n')
    f.write('-'*90 + '\n')
    f.write('%-45s %-35s %8s\n' % ('Imagen', 'Nombre', 'Coins'))
    f.write('-'*90 + '\n')
    for r in data:
        name = r['name'] if r['name'] else '---'
        price = str(r['price']) if r['price'] is not None else 'N/A'
        f.write('%-45s %-35s %8s\n' % (r['filename'], name, price))

print('Archivo gifts_prices.txt creado')
print('Total:', len(data))
print('Con precio:', con_precio)
print('Sin precio:', sin_precio)
