import json

with open('gifts_prices.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

items = [
    '001_Rosa.png','015_Tom_el_tomate.png','221_Rosa.png','391_Corgi.png',
    '493_Corgi_con_flor_de_cerezo.png','494_Coral.png','503_Prince.png',
    '516_Pistola_de_dinero.png','546_Cisne.png','571_Galaxia.png',
    '595_Fuegos_artificiales.png','668_Autob_s_de_fiesta.png','698_Jet_privado.png',
    '788_F_nix.png','795_Golazo.png','797_Ballena_Sam.png',
    '803_TikTok_Universe_.png','810_TikTok_Universe.png'
]

for item in items:
    for r in data:
        if r['filename'] == item:
            print(f"{r['filename']:<35} {r['name']:<25} {r['price']}")
            break
