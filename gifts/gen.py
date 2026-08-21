import os, json, re

PRICES = {
    'Rose': 1, 'Send': 1, 'Youre awesome': 1, 'GG': 1, 'Love you so much': 1,
    'Heart Puff': 1, 'Gamer Level Up': 5, 'Gamer Tater': 10, 'A Shard of Hope': 1,
    'Lightning Bolt': 1, 'Cool': 1, 'Its corn': 1, 'Pop': 1, 'Finger Heart': 5,
    'Super GG': 100, 'TikTok': 1, 'Chili': 1, 'Ice Cream Cone': 1, 'Cake Slice': 1,
    'Laughing Taco': 1, 'Freestyle': 1, 'Wink wink': 1, 'GOAT': 1, 'Dolphin': 10,
    'Oldies': 1, 'LIVE': 1, 'Doughnut': 30, 'Rosa': 10, 'Friendship Necklace': 10,
    'Overreact': 5, 'Perfume': 20, 'Game Controller': 100, 'Spinning Soccer': 5,
    'Corgi': 299, 'Name shoutout': 5, 'Hand Heart': 100, 'Hand Hearts': 100,
    'Hi Bear': 10, 'Let Em Cook': 20, 'Slow motion': 10, 'Money Gun': 500,
    'New York Cab': 10, 'Bravo': 15, 'Paper Crane': 99, 'Galaxy': 1000,
    'Gold Boxing Gloves': 10, 'Gold Medal': 200, 'Journey Pass': 10, 'Spring Sunset': 300,
    'Night Star': 199, 'Bouquet': 500, 'Chicago Pizza': 20, 'Meteor Shower': 3000,
    'Confetti': 100, 'Swan': 699, 'Thats All': 10, 'Boxing Gloves': 299, 'Train': 899,
    'Chasing the Dream': 1500, 'Fist Bump': 90, 'Youre Amazing': 500, 'Tiny Diny Trek': 200,
    'Manifesting': 500, 'Cooper Flies Home': 1999, 'Moonwalk': 150, 'Forever Rosa': 399,
    'Party Bus': 2999, 'Prince': 500, 'Starlight Sceptre': 1200, 'Air Dancer': 300,
    'Taraxacum Corgi': 400, 'Pumpkin Carriage': 1031, 'Star Map Polaris': 500,
    'Hip-Hop Hen': 3200, 'Hi May': 88, 'Racing Debut': 1500, 'Baby Dragon': 2000,
    'Future Encounter': 1500, 'Sakura Corgi': 499, 'Private Jet': 4888, 'Phoenix': 25999,
    'Flying Jets': 5000, 'Journal': 299, 'Unicorn Fantasy': 5000, 'Motorcycle': 2988,
    'Wild Mic': 1500, 'Galaxy Globe': 1500, 'Strong Finish': 6000, 'Glowing Jellyfish': 1000,
    'Blooming Ribbons': 1000, 'Coral': 499, 'Watermelon Love': 1000, 'Castle Fantasy': 20000,
    'Sports Car': 7000, 'Dinosaur': 1000, 'Rosie the Rose Bean': 399, 'October': 88,
    'Rose Bear': 214, 'Hanging Lights': 199, 'Jollie the Joy Bean': 399, 'Ring Light': 299,
    'Viking Hammer': 1500, 'TikTok Shuttle': 20000, 'Interstellar': 10000, 'I Love TikTok LIVE': 200,
    'Wave Lights': 2200, 'Sunset Speedway': 10000, 'Under Control': 1500, 'Diamond': 1099,
    'Party Laser': 1300, 'Blow Bubbles': 199, 'Time for Family': 15000, 'Sage the Smart Bean': 399,
    'Rising Key': 299, 'Furry Friends': 249, 'Panther Paws': 199, 'Super LIVE Star': 1000,
    'Fireworks': 1088, 'Rocky the Rock Bean': 399, 'Diamond Microphone': 500, 'Meerkat': 199,
    'Diny Dandelion': 249, 'Jollies Heartland': 2199, 'Gimme The Mic': 12000, 'Pyramids': 15000,
    'Ignition Check': 1500, 'Trick or Treat': 299, 'Sages Coinbot': 2199, 'Gold Mine': 1000,
    'Louis the Cardinal': 150, 'Spirits Up': 5000, 'Sour Buddy': 199, 'Squeeze the Day': 2000,
    'Award': 4500, 'Canyon Bighorn': 349, 'Fruit Friends': 299, 'Goal': 500, 'Gamers EVE': 5000,
    'Rose Hand': 199, 'Potato in Paris': 199, 'Legendary Finish': 15000, 'LA Route 66': 1000,
    'Bran Castle': 15000, 'Melon Juice': 199, 'Gamer Cat': 199, 'Speedster': 15000,
    'My First Rose': 1, 'Glow Stick': 1, 'Heart Me': 1, 'So Cute': 1, 'Congratulations': 1,
    'Creeper': 1, 'Chrono Rewinder': 1, 'Light Castle': 1, 'King Leonardo': 1, 'Thumbs Up': 1,
    'Heart': 1, 'Love you': 1, 'Blue Heart': 1, 'Flame heart': 1, 'Power hug': 1, 'Squirrel': 1,
    'Chilli Pepper': 1, 'Glass of Airan': 1, 'Music Album': 1, 'Graduation Bouquet': 1,
    'coldy': 1, 'Red Lightning': 1, 'Blue Lightning': 1, 'Yellow Lightning': 1, 'Go Popular': 1,
    'Club Cheers': 1, 'Wink Charm': 1, 'Team Bracelet': 2, 'Super Popular': 9, 'Cheer You Up': 9,
    'Club Power': 9, 'Sing Together': 10, 'FANDOM Fan': 10, 'League Ball': 10, 'Lucky Pony': 10,
    'Gutab': 10, 'Style Me Up': 10, 'Banana Peel': 10, 'Heart Gaze': 10, 'Dombra': 20,
    'Sushi Set': 20, 'Traffic Cone': 20, 'You are my Jam': 30, 'Energy Capsule': 30, 'Butterfly': 88,
    'Little Crown': 99, 'Cap': 99, 'Hat and Mustache': 99, 'Like-Pop': 99, 'Love Painting': 99,
    'Bubble Gum': 99, 'Cupids Bow': 99, 'Mark of Love': 99, 'Sundae Bowl': 99, 'Charmer Bow': 99,
    'Club Victory': 99, 'Level-up Sparks': 99, 'Greeting Heart': 99, 'FANDOM Stamp': 100,
    'Mishka Bear': 100, 'Tsar': 100, 'Power Chip': 100, 'Marvelous Confetti': 100, 'Singing Magic': 100,
    'Bowknot': 149, 'Big Shout Out': 149, 'Chatting Popcorn': 149, 'Masquerade': 149, 'Balloon Crown': 149,
    'Feather Tiara': 149, 'Caterpillar Chaos': 149, 'Catrina': 149, 'Raving Snail': 149,
    'Santa Cocoa': 149, 'Love Glasses': 149, 'Fairy Hide': 149, 'Frog Conductor': 149,
    'Potato Transformation': 150, 'League Countdown': 199, 'Sunglasses': 199, 'Hearts': 199,
    'Garland Headpiece': 199, 'Love You': 199, 'Cheer For You': 199, 'Panther Paws': 199,
    'Tyubeteika': 199, 'Stinging Bee': 199, 'Massage for You': 199, 'Coffee Magic': 199,
    'Dancing Hands': 199, 'Pinch Cheek': 199, 'Stroke Hair': 199, 'Cheering Crab': 199,
    'Twinkling Star': 199, 'Wooly Hat': 199, 'Love Rain': 199, 'Floating Octopus': 199,
    'Flower Headband': 199, 'Chirpy Kisses': 199, 'Joker Ball': 199, 'Heart Hood': 199,
    'Party Pony': 199, 'Fan Cat': 199, 'Magic Genie': 200, 'Pinch Face': 249, 'Candy Bouquet': 249,
    'Ice Cream Mic': 249, 'Star Goggles': 249, 'Cheer Mic': 249, 'Music Bubbles': 249,
    'Palm Breeze': 249, 'Forest Elf': 249, 'Face-pulling': 249, 'Treasured Voice': 249,
    'Melodic birds': 249, 'Surfing Penguin': 249, 'Party Blossom': 249, 'Dreamy Strings': 249,
    'Sweet Flutter': 249, 'Snow Bloom': 249, 'Amped Up': 249, 'EID Gift Box': 299,
    'LIVE Ranking Crown': 299, 'Koala Love': 299, 'Naughty Chicken': 299, 'Play for You': 299,
    'Rock Star': 299, 'Elephant trunk': 299, 'Butterfly for You': 299, 'Starlight Compass': 299,
    'Pawfect': 299, 'Puppy Kisses': 299, 'United Heart': 299, 'Kicker Challenge': 299,
    'Hi Rosie': 299, 'Go Hamster': 299, 'Bat Headwear': 299, 'Melody Glasses': 299,
    'Penguin Snowpal': 299, 'Music Mate': 299, 'Love Call': 299, 'Pony Lantern': 299,
    'Spring Sprout': 299, 'Wakey Mallow': 299, 'Sax Groove': 299, 'Scroll': 299,
    'Budding Heart': 299, 'Feather Mask': 300, 'Festival Bracelet': 349, 'Backing Monkey': 349,
    'Become Kitten': 349, 'Marked with Love': 349, 'Vinyl Flip': 349, 'Juicy Cap': 349,
    'Batwing Hat': 349, 'Mystic Drink': 349, 'Beach Maracas': 349, 'Vintage flight': 349,
    'Gingerbread Man': 349, 'Rocking Shroom': 349, 'Sparkle Pony': 349, 'Spring Bouquet': 349,
    'Magic Rhythm': 399, 'Relaxed Goose': 399, 'Toms Hug': 399, 'Sages Slash': 399,
    'Let butterfly dances': 399, 'Kitten Kneading': 399, 'Shoot the Apple': 399, 'Alien Buddy': 399,
    'Rosies Concert': 399, 'You Are Loved': 399, 'Tiger Lift': 399, 'Santa Owl Surprise': 399,
    'Confetti Bear': 399, 'Singing Sax': 399, 'Fairy Locket': 399, 'Panda Snap': 399,
    'Blossom Fairy': 399, 'Dreamy Hat': 399, 'Vocal Bear': 399, 'Cactus Shuffle': 399,
    'Health Potion': 399, 'FANDOM Fever': 400, 'Crystal Dreams': 400, 'Wishing Cake': 400,
    'Mic Champ': 400, 'Bounce Speakers': 400, 'Reindeer Milk': 400, 'Cheeky Pup': 400,
    'DJ Wave': 400, 'Beating Heart': 449, 'Encore Clap': 449, 'Pirates Treasure': 449,
    'Candy Loot': 449, 'Captured Vocals': 449, 'Batting Cutie': 449, 'Space Love': 449,
    'Xmas Tree Hat': 449, 'Clown Boogie': 449, 'Powerful Mind': 450, 'Hat of Joy': 450,
    'Halloween Fun Hat': 450, 'Music Conductor': 450, 'Celebration Hat': 450, 'City Pop': 450,
    'Cupid Koala': 450, 'Paw Call': 450, 'Superwoman': 450, 'Clover Hat': 450, 'Sloth Peek': 450,
    'Panda Hug': 499, 'Im Just a Hamster': 499, 'Rose Soundwave': 499, 'Hands Up': 499,
    'Shell of a Warrior': 500, 'Baby Chicks': 500, 'VR Goggles': 500, 'DJ Glasses': 500,
    'Couch Potato': 500, 'Dragon Crown': 500, 'Racing Helmet': 500, 'XXXL Flowers': 500,
    'Flower Show': 500, 'Bunny Crown': 500, 'Magic Prop': 500, 'Cozy Xmas Set': 500,
    'Mystery Box': 500, 'Heart Guitar': 500, 'Prairie Diny': 500, 'Prairie Tom': 500,
    'Prairie Blitzy': 500, 'Prairie Cooper': 500, 'Jungle Diny': 500, 'Jungle Tom': 500,
    'Jungle Blitzy': 500, 'Jungle Cooper': 500, 'Starry Fluff': 500, 'Gem Gun': 500,
    'Bubbly Kiss': 530, 'Hive Escape': 549, 'Drum Hamster': 549, 'League Trophy': 599,
    'Fully Bloomed Sakura': 599, 'Join Butterflies': 600, 'Seahorse Pop': 649, 'Colorful Wings': 700,
    'The Van Cat': 799, 'Love Flight': 800, 'Music Burst': 999, 'Travel with You': 999,
    'Lucky Airdrop Box': 999, 'Grand show': 999, 'Trending Figure': 999, 'Silver Sports Car': 1000,
    'Gerry the Giraffe': 1000, 'Hunting Dog': 1000, 'Fairy Wings': 1000, 'Flamingo Groove': 1000,
    'Firepit Diny': 1000, 'Firepit Tom': 1000, 'Firepit Blitzy': 1000, 'Firepit Cooper': 1000,
    'Desert Diny': 1000, 'Desert Tom': 1000, 'Desert Blitzy': 1000, 'Desert Cooper': 1000,
    'Tundra Diny': 1000, 'Tundra Tom': 1000, 'Tundra Blitzy': 1000, 'Tundra Cooper': 1000,
    'Magic Potion': 1000, 'Shiny air balloon': 1000, 'Sparkle Dance': 1000, 'Joy Floats': 1030,
    'Candy Puffs': 1030, 'Magic Role': 1088, 'Umbrella of Love': 1200, 'Vibrant Stage': 1400,
    'Level Ship': 1500, 'Raya Gift Card': 1500, 'Lovers Lock': 1500, 'Greeting Card': 1500,
    'Youre So Fly': 1500, 'Astrobear': 1500, 'Blooming Heart': 1599, 'Here We Go': 1799,
    'Love Drop': 1800, 'Fox Legend': 1800, 'Doll New Year Greeting': 1999, 'Star of Red Carpet': 1999,
    'Mystery Firework': 1999, 'Club Music': 2000, 'Sky Drift': 2000, 'Whale Diving': 2150,
    'Blow Rosie Kisses': 2199, 'Rockys Punch': 2199, 'Haunted house': 2200, 'By the Glaziers': 2380,
    'FANDOM Cheer': 2500, 'Animal Band': 2500, 'Samfaring Tom': 2850, 'Pink Dream': 2988,
    'Surprise Baby Mob': 2999, 'Ring Of Honor-Cube': 2999, 'Rhythmic Bear': 2999,
    'Summoning Horn': 3000, 'Sea Diny': 3088, 'Sea Tom': 3088, 'Sea Blitzy': 3088,
    'Sea Cooper': 3088, 'Look Up': 3350, 'Dream Big': 3350, 'Go Home': 3999, 'Shine Bright': 4088,
    'Your Concert': 4500, 'Dynamic Music': 4888, 'Leon the Kitten': 4888, 'Fiery Dragon': 4888,
    'Signature Jet': 4888, 'Sugar Whiskers': 4918, 'Sages Venture': 4999, 'Hero Space Ship': 4999,
    'Crowd Cheering': 5000, 'Diamond Gun': 5000, 'League Fandom': 5000, 'Yurt': 5000,
    'Leons Sigil Cape': 5000, 'Fluffy Buddies': 5388, 'Wolf': 5500, 'Cub on Clouds': 5888,
    'Valiant Odyssey': 5888, 'Devoted Heart': 5999, 'Chick Stampede': 6000, 'Rust Reforged': 6000,
    'Future City': 6000, 'Sam in New City': 6000, 'Work Hard Play Harder': 6000,
    'Lili the Leopard': 6599, 'Celebration Time': 6999, 'Happy Party': 6999, 'Majestic Hearts': 7238,
    'Star Throne': 7999, 'Ultimate FANDOM': 8000, 'Maiden Tower': 8000, 'Leon and Lili': 9699,
    'Henry': 10000, 'Falcon': 10999, 'Level-up Spectacle': 12999, 'Tidecaller Trident': 14999,
    'Invincible Hammer': 14999, 'Crystal Heart': 14999, 'Crocodile': 15000, 'Battle Champion': 15000,
    'Golden Gallop': 15000, 'Paris': 15000, 'Sneaky Jockey': 15000, 'Rosa Nebula': 15000,
    'Future Journey': 15000, 'Party OnOn': 15000, 'Flame Towers': 15000, 'Stallion': 15000,
    'Snow Leopard': 15000, 'Amusement Park': 17000, 'Rust vs World': 18999, 'Fly Love': 19999,
    'Premium Shuttle': 20000, 'Infinite Heart': 23999, 'Cyber Roar': 25999, 'Undersea Kingdom': 25999,
    'Adams Dream': 25999, 'Dragon Flame': 26999, 'Lion': 29999, 'Gorilla': 30000, 'Zeus': 34000,
    'Leon and Lion': 34000, 'TikTok Universe+': 34999, 'Thunder Falcon': 39999, 'Fire Phoenix': 41999,
    'Legend Marcellus': 42999, 'Pegasus': 42999, 'Julius the Champion': 43999, 'TikTok Universe': 44999,
    'TikTok Stars': 39999,
}

NAME_MAP = {
    '001_Rosa': 'Rosa', '002_Coraz_n_de_fuego': 'Flame heart', '003_Huella_de_dinosaurio': 'Dinosaur',
    '004_Alas_de_hada': 'Fairy Wings', '005_Te_adoro': 'Love you so much', '006_Eres_incre_ble': 'Youre awesome',
    '007_Nube_de_coraz_n': 'Heart Puff', '008_TikTok': 'TikTok', '010_Gui_o_gui_o': 'Wink wink',
    '011_Estilo_libre': 'Freestyle', '012_Cl_sicos': 'Oldies', '014_Pop': 'Pop',
    '015_Tom_el_tomate': 'Gamer Tater', '016_Genial': 'Cool', '019_Mascota_extraterrestre': 'Alien Buddy',
    '021_Pase_de_verano_S': 'Journey Pass', '026_Rosa_blanca': 'My First Rose', '030_Rebanada_de_pastel': 'Cake Slice',
    '031_Rayo': 'Lightning Bolt', '032_A_todo_gas': 'GOAT', '034_GG': 'GG',
    '035_Cono_de_helado': 'Ice Cream Cone', '038_Creeper': 'Creeper', '039_Enhorabuena': 'Congratulations',
    '040_Qu_lindo': 'So Cute', '042_Coraz_n': 'Heart', '043_Te_quiero': 'Love you',
    '045__lbum_de_m_sica': 'Music Album', '046_Mi_primera_rosa': 'My First Rose', '047_coldy': 'coldy',
    '048_Rel_mpago_rojo': 'Red Lightning', '049_Rel_mpago_azul': 'Blue Lightning', '050_Rel_mpago_amarillo': 'Yellow Lightning',
    '051_Gui_o_encantador': 'Wink Charm', '052_Hazte_popular': 'Go Popular', '053__nimo_del_equipo': 'Club Cheers',
    '163_es_ma_z': 'Its corn', '184_Barra_fluorescente': 'Glow Stick', '185_Chile': 'Chilli Pepper',
    '195_Pulsera_de_equipo': 'Team Bracelet', '196_Exageraci_n': 'Overreact', '197_Saludo_personalizado': 'Name shoutout',
    '204_Coraz_n_coreano': 'Finger Heart', '206_Helado': 'Ice Cream Cone', '211_Superpopular': 'Super Popular',
    '213_Poder_del_equipo': 'Club Power', '215_Vinilo_de_DJ': 'Vinyl Flip', '216_C_mara_lenta': 'Slow motion',
    '217_Pase_para_el_evento': 'Journey Pass', '219_Patata_con_helado': 'Gamer Tater', '220_Collar_de_amistad': 'Friendship Necklace',
    '221_Rosa': 'Rosa', '223_Peque_o_dinosaurio': 'Tiny dino', '225_Guantes_de_boxeo_dorados': 'Gold Boxing Gloves',
    '226_Poni_de_la_suerte': 'Lucky Pony', '227_Bal_n_de_la_liga': 'League Ball', '228_Abanico_del_FANDOM': 'FANDOM Fan',
    '229_Chocolate': 'Chocolate', '233_Dame_tu_estilo': 'Style Me Up', '234_C_scara_de_pl_tano': 'Banana Peel',
    '235_Mirada_de_coraz_n': 'Heart Gaze', '238_Coraz_n': 'Heart', '240__Bravo_': 'Bravo',
    '243_Perfume': 'Perfume', '244_Cono_de_tr_fico': 'Traffic Cone', '247_You_are_my_Jam': 'You are my Jam',
    '249_Rosquilla': 'Doughnut', '250_P_ldora_de_energ_a': 'Energy Capsule', '254_Mariposa': 'Butterfly',
    '256_Choque_de_pu_os': 'Fist Bump', '258_Arco_del_amor': 'Cupids Bow', '259_Bol_de_helado': 'Sundae Bowl',
    '261_Marca_de_amor': 'Mark of Love', '262_Chicle': 'Bubble Gum', '263_Pintura_de_amor': 'Love Painting',
    '264_Metralleta_de_me_gustas': 'Like-Pop', '267_Sombrero_y_bigote': 'Hat and Mustache', '268_Gorra': 'Cap',
    '269_Coronita': 'Little Crown', '270_Cisne_de_papel': 'Paper Crane', '272_Coraz_n_de_felicitaci_n': 'Greeting Heart',
    '273_Victoria_del_Club_de_fans': 'Club Victory', '277_Osito_Mishka': 'Mishka Bear', '278_Coraz_n_con_las_manos': 'Hand Hearts',
    '279_Concha_con_energ_a': 'Shell of a Warrior', '280_Confeti': 'Confetti', '281_Sello_del_FANDOM': 'FANDOM Stamp',
    '282_Chip_de_potencia': 'Power Chip', '283_Canto_m_gico': 'Singing Magic', '284_Confeti_de_Colores': 'Marvelous Confetti',
    '286_Super_GG': 'Super GG', '287_Hada_escondida': 'Fairy Hide', '288_Gafas_de_coraz_n': 'Love Glasses',
    '289_Taza_de_chocolate_de_Pap_Noel': 'Santa Cocoa', '290_Caracol_delirante': 'Raving Snail', '291_Catrina': 'Catrina',
    '292_Caos_con_oruga': 'Caterpillar Chaos', '293_Tiara_de_plumas': 'Feather Tiara', '294_Globos_con_forma_de_coraz_n': 'Balloon Crown',
    '295_M_scara_misteriosa': 'Masquerade', '296_Chat_con_palomitas': 'Chatting Popcorn', '297_Un_grito_por_todo_lo_alto': 'Big Shout Out',
    '298_Lazo': 'Bowknot', '299_Patata_en_transformaci_n': 'Potato Transformation', '301_Paraguas': 'Umbrella of Love',
    '304_Poni_festivo': 'Party Pony', '305_Gorro_con_forma_de_coraz_n': 'Heart Hood', '306_Bola_del_joker': 'Joker Ball',
    '307_Besitos_de_pajaritos': 'Chirpy Kisses', '308_Agua_de_coco': 'Coconut Juice', '309_Rosa_de_mano': 'Rose Hand',
    '311_Amigo_cido': 'Sour Buddy', '313_Diadema_de_flores': 'Flower Headband', '314_Pulpo_flotante': 'Floating Octopus',
    '315_Cangrejo_animador': 'Cheering Crab', '316_Caf_m_gico': 'Coffee Magic', '317_Masaje_para_ti': 'Massage for You',
    '318_Abeja_dispuesta_a_picar': 'Stinging Bee', '320_Te_quiero': 'Love you', '321_Tocado_de_flores': 'Garland Headpiece',
    '322_Corazones': 'Hearts', '323_Gafas_de_sol': 'Sunglasses', '324_Cuenta_atr_s_para_la_liga': 'League Countdown',
    '325_Me_alegro_por_ti': 'Cheer For You', '330_Gafas_con_forma_de_estrella': 'Star Goggles', '331_Estrella_nocturna': 'Night Star',
    '336_Estrella_brillante': 'Twinkling Star', '337_Zumo_de_mel_n': 'Melon Juice', '340_Ventilador': 'Fan Cat',
    '345_Genio_m_gico': 'Magic Genie', '347_Medalla_de_oro': 'Gold Medal', '351_Oso_rosa': 'Rose Bear',
    '353_Amplificado': 'Amped Up', '354_Flores_de_nieve': 'Snow Bloom', '355_Dulce_aleteo': 'Sweet Flutter',
    '356_Cuerdas_de_ensue_o': 'Dreamy Strings', '357_Flores_festivas': 'Party Blossom', '358_Ping_ino_surfista': 'Surfing Penguin',
    '359_P_jaros_mel_dicos': 'Melodic birds', '360_Voz_preciada': 'Treasured Voice', '362_Elfo_del_bosque': 'Forest Elf',
    '363_Brisa_de_palmera': 'Palm Breeze', '364_Auriculares_con_pompas': 'Music Bubbles', '365_Micr_fono_animador': 'Cheer Mic',
    '366_Gafas_de_estrellas': 'Star Goggles', '367_Micr_fono_de_helado': 'Ice Cream Mic', '368_Ramo_de_caramelos': 'Candy Bouquet',
    '369_Pellizcar_los_mofletes': 'Pinch Face', '370_Guantes_de_boxeo': 'Boxing Gloves', '371_Ritmo_de_saxo': 'Sax Groove',
    '372_Nube_despierta': 'Wakey Mallow', '373_Brote_primaveral': 'Spring Sprout', '374_Poni_con_farolillo': 'Pony Lantern',
    '375_Llamada_del_amor': 'Love Call', '376_Compa_ero_musical': 'Music Mate', '377_Amigo_ping_ino_en_d_as_de_nieve': 'Penguin Snowpal',
    '378_Gafas_Melody': 'Melody Glasses', '379_Sombrero_de_murci_lago': 'Bat Headwear', '380_Convi_rtete_en_un_h_mster': 'Go Hamster',
    '381_El_estilo_de_Rosie': 'Hi Rosie', '382_Reto_de_goleador': 'Kicker Challenge', '383_Coraz_n_de_amor': 'United Heart',
    '384_Besitos_de_cachorrito': 'Puppy Kisses', '385_Mariposas_para_ti': 'Butterfly for You', '386_Estrella_del_rock': 'Rock Star',
    '387_Toca_para_ti': 'Play for You', '388_Pollo_travieso': 'Naughty Chicken', '389_Amigos_frutales': 'Fruit Friends',
    '390_Trompa_y_orejas_de_elefante': 'Elephant trunk', '391_Corgi': 'Corgi', '392_Corona_de_clasificaci_n_LIVE': 'LIVE Ranking Crown',
    '393_Caja_de_regalo_del_Eid_n_m_': 'EID Gift Box', '394_Pergamino': 'Scroll', '395_Coraz_n_naciente': 'Budding Heart',
    '397_Apret_n_de_manos': 'Hand Hearts', '402_Tiny_Diny_con_tri_ngulo': 'Tiny Diny Trek', '403_Diario': 'Journal',
    '404_M_scara_con_plumas': 'Feather Mask', '405_Bailar_n_inflable': 'Air Dancer', '406_Ramo_primaveral': 'Spring Bouquet',
    '407_Poni_con_varita_brillante': 'Sparkle Pony', '408_Champi_n_roquero': 'Rocking Shroom', '409_Ramo_de_caramelos': 'Candy Bouquet',
    '410_Mu_eco_de_jengibre': 'Gingerbread Man', '411_Aviador_vintage': 'Vintage flight', '412_Maracas_de_playa': 'Beach Maracas',
    '413_Bebida_m_stica': 'Mystic Drink', '414_Sombrero_con_alas_de_murci_lago': 'Batwing Hat', '417_Convi_rtete_en_gatito': 'Become Kitten',
    '419_Pase_de_verano_M': 'Journey Pass', '420_Pulsera_del_festival': 'Festival Bracelet', '421_Vinilo_girando': 'Vinyl Flip',
    '425_Cactus_Shuffle': 'Cactus Shuffle', '426_Oso_vocalista': 'Vocal Bear', '427_Gorro_de_dormir': 'Dreamy Hat',
    '428_Hada_floral': 'Blossom Fairy', '429_Instant_nea_de_panda': 'Panda Snap', '430_Medall_n_m_gico': 'Fairy Locket',
    '431_Saxof_n_cantar_n': 'Singing Sax', '432_Oso_con_confeti': 'Confetti Bear', '433_B_ho_sorpresa_de_Pap_Noel': 'Santa Owl Surprise',
    '434_Entrenando_como_un_tigre': 'Tiger Lift', '435_El_saxof_n_de_Rosie': 'Rosies Concert', '437_Amigo_alien_gena': 'Alien Buddy',
    '438_Dispara_a_la_manzana': 'Shoot the Apple', '439_Gatito_achuchable': 'Kitten Kneading', '440_Deja_que_la_mariposa_baile': 'Let butterfly dances',
    '441_Sage_la_semilla_inteligente': 'Sage the Smart Bean', '442_Rocky_la_semilla_roquera': 'Rocky the Rock Bean',
    '443_Jollie_la_semilla_de_la_alegr_a': 'Jollie the Joy Bean', '444_Rosie_la_semilla_rosa': 'Rosie the Rose Bean',
    '445_Abrazo_de_Tom': 'Toms Hug', '446_Oca_relajada': 'Relaxed Goose', '447_Ritmo_m_gico': 'Magic Rhythm',
    '448_Rosa_de_la_eternidad': 'Forever Rosa', '450_El_descuento_de_Sage': 'Sages Slash', '451_Poci_n_medicinal': 'Health Potion',
    '452_Vuelo_en_flor': 'Flower flight', '454__No_me_lo_puedo_creer_': 'Overreact', '456_Eres_amado_a': 'You Are Loved',
    '459_Ola_de_DJ': 'DJ Wave', '460_Cachorrito_travieso': 'Cheeky Pup', '461_Taza_de_leche_con_forma_de_reno': 'Reindeer Milk',
    '462_Corgi_con_diente_de_le_n': 'Taraxacum Corgi', '463_Altavoces_que_rebotan': 'Bounce Speakers', '464_As_del_micr_fono': 'Mic Champ',
    '465_Tarta_para_pedir_un_deseo': 'Wishing Cake', '466_Sue_os_de_cristal': 'Crystal Dreams', '467_Fiebre_del_FANDOM': 'FANDOM Fever',
    '468_Payaso_bailar_n': 'Clown Boogie', '469_Sombrero_de_rbol_de_Navidad': 'Xmas Tree Hat', '470_Amor_espacial': 'Space Love',
    '471_Bateador_mono': 'Batting Cutie', '472_Voces_capturadas': 'Captured Vocals', '473_Bot_n_de_dulces': 'Candy Loot',
    '474_El_tesoro_de_un_pirata': 'Pirates Treasure', '476_Pedir_aplausos': 'Encore Clap', '477_Coraz_n_que_late': 'Beating Heart',
    '478_Mirada_de_perezoso': 'Sloth Peek', '479_Sombrero_de_tr_bol': 'Clover Hat', '480_Supermujer': 'Superwoman',
    '481_Llamada_de_perrito': 'Paw Call', '482_Koala_cupido': 'Cupid Koala', '483_Pop_urbano': 'City Pop',
    '484_Gorro_de_fiesta': 'Celebration Hat', '485_Director_de_orquesta': 'Music Conductor', '486_Sombrero_divertido_de_Halloween': 'Halloween Fun Hat',
    '487_Gorro_divertido': 'Hat of Joy', '488_Mente_poderosa': 'Powerful Mind', '492_Abrazo_de_panda': 'Panda Hug',
    '493_Corgi_con_flor_de_cerezo': 'Sakura Corgi', '494_Coral': 'Coral', '495_Micr_fono_de_oro': 'Diamond Microphone',
    '496_Manos_arriba': 'Hands Up', '497_Gorro_peludito_con_estrellas': 'Starry Fluff', '498_Guitarra_con_forma_de_coraz_n': 'Heart Guitar',
    '499_Caja_sorpresa': 'Mystery Box', '501_Conjunto_navide_o_calentito': 'Cozy Xmas Set', '503_Prince': 'Prince',
    '504_Sombrero_con_orejitas_de_conejo': 'Bunny Crown', '505_Espect_culo_floral': 'Flower Show', '506_Flores_XXXL': 'XXXL Flowers',
    '507_Corona_de_drag_n': 'Dragon Crown', '508_Adicto_a_las_pantallas': 'Couch Potato', '509_Manifestando': 'Manifesting',
    '510_Gafas_de_DJ': 'DJ Glasses', '511_Gafas_de_RV': 'VR Goggles', '512_Patata_grande': 'Couch Potato',
    '513_Molas_un_mont_n': 'Youre Amazing', '516_Pistola_de_dinero': 'Money Gun', '517_Trofeo': 'Award',
    '518_Pollitos': 'Baby Chicks', '520_Premio_m_gico': 'Magic Prop', '521_Diny_en_la_pradera': 'Prairie Diny',
    '522_Tom_en_la_pradera': 'Prairie Tom', '523_Blitzy_en_la_pradera': 'Prairie Blitzy', '524_Cooper_en_la_pradera': 'Prairie Cooper',
    '525_Diny_en_la_jungla': 'Jungle Diny', '526_Tom_en_la_jungla': 'Jungle Tom', '527_Blitzy_en_la_jungla': 'Jungle Blitzy',
    '528_Cooper_en_la_jungla': 'Jungle Cooper', '529_Pistola_de_Gemas': 'Gem Gun', '530_Polaris': 'Star Map Polaris',
    '531_Rosas': 'Bouquet', '533_Jardiner_a': 'Gardening', '534_Casco_de_carrera': 'Racing Helmet',
    '535_Star_Map_Polaris': 'Star Map Polaris', '536_Beso_de_burbujas': 'Blow Bubbles', '537_H_mster_con_tambor': 'Drum Hamster',
    '538_Escape_de_la_colmena': 'Hive Escape', '540_Trofeo_de_la_liga': 'League Trophy', '541_Cerezo_en_flor': 'Fully Bloomed Sakura',
    '545_Pop_de_caballito_de_mar': 'Seahorse Pop', '546_Cisne': 'Swan', '547_Alas_coloridas': 'Colorful Wings',
    '555_Tren': 'Train', '557_LOVE_U': 'Love you so much', '559_Flamenco_flotante': 'Flamingo Groove',
    '560_Viaje_juntos': 'Travel with You', '561_Caja_de_lanzamiento_a_reo_de_la_suerte': 'Lucky Airdrop Box',
    '562_Gran_espect_culo': 'Strong Finish', '563_Celebridad': 'Trending Figure', '565_dinosaurio': 'Dinosaur',
    '569_Alas_de_hada': 'Fairy Wings', '571_Galaxia': 'Galaxy', '572_Cintas_florecientes': 'Blooming Ribbons',
    '573_Medusa_brillante': 'Glowing Jellyfish', '575_Jirafa_Gerry': 'Gerry the Giraffe', '576_Bola_de_discoteca': 'Disco ball',
    '577_Diny_en_el_cr_ter_de_lava': 'Firepit Diny', '578_Tom_en_el_cr_ter_de_lava': 'Firepit Tom', '579_Blitzy_en_el_cr_ter_de_lava': 'Firepit Blitzy',
    '580_Cooper_en_el_cr_ter_de_lava': 'Firepit Cooper', '581_Diny_en_el_desierto': 'Desert Diny', '582_Tom_en_el_desierto': 'Desert Tom',
    '583_Blitzy_en_el_desierto': 'Desert Blitzy', '584_Cooper_en_el_desierto': 'Desert Cooper', '585_Diny_en_la_tundra': 'Tundra Diny',
    '586_Tom_en_la_tundra': 'Tundra Tom', '587_Blitzy_en_la_tundra': 'Tundra Blitzy', '588_Cooper_en_la_tundra': 'Tundra Cooper',
    '589_Poci_n_m_gica': 'Magic Potion', '590_Baile_brillante': 'Sparkle Dance', '591_Globo_Aerost_tico_Brillante': 'Shiny air balloon',
    '592_Sand_a_enamorada': 'Watermelon Love', '593_Delicia_flotante': 'Joy Floats', '594_Galaxia_dulce': 'Galaxy Globe',
    '595_Fuegos_artificiales': 'Fireworks', '596__rbol_de_diamantes': 'Diamond', '597_Rol_m_gico': 'Magic Role',
    '602_L_ser_festivo': 'Party Laser', '603_Escenario_vibrante': 'Vibrant Stage', '605_Micro_salvaje': 'Wild Mic',
    '606_Debut_en_las_carreras': 'Racing Debut', '608_Manifestaci_n_XXL': 'Manifesting', '609_Bajo_control': 'Under Control',
    '612_Futuro_encuentro': 'Future Encounter', '613_Tarjeta_de_felicitaci_n': 'Greeting Card', '614_Candado_de_amor': 'Lovers Lock',
    '616_Todo_por_un_sue_o': 'Chasing the Dream', '617_Rey_de_diamantes': 'Diamond', '618_Nave_de_nivel': 'Level Ship',
    '619_Tarjeta_regalo_de_Raya': 'Raya Gift Card', '620_Martillo_Vikingo': 'Viking Hammer', '621_Trofeo_EWC': 'EWC Trophy',
    '622_Molas_un_mont_n_en_el_aire': 'Youre So Fly', '623_Oso_espacial': 'Astrobear', '625_Estrellas_fugaces': 'Meteor Shower',
    '627_Coraz_n_en_flor': 'Blooming Heart', '630_All_vamos': 'Here We Go', '631_Zorro_de_nueve_colas': 'Fox Legend',
    '633_Sorpresa_rom_ntica': 'Love Drop', '634_Fuegos_artificiales_misteriosos': 'Mystery Firework', '635_Cooper_vuela_a_casa': 'Cooper Flies Home',
    '637_Felicitaci_n_de_A_o_Nuevo_con_mu_ecos': 'Doll New Year Greeting', '638_Estrella_de_la_alfombra_roja': 'Star of Red Carpet',
    '639_B_squeda_de_huevos_de_Pascua': 'Egg Hunt', '642__Recibe_mi_rosa_': 'Rose', '644_M_sica_disco': 'Club Music',
    '649_Beb_drag_n': 'Baby Dragon', '650_Ballena_sumergida': 'Whale Diving', '652_Bot_de_Monedas_de_Sage': 'Sages Coinbot',
    '653_El_pu_etazo_de_Rocky': 'Rockys Punch', '655_Tira_besos_con_Rosie': 'Blow Rosie Kisses', '657_Luces_oscilantes': 'Wave Lights',
    '659_Pase_de_verano_L': 'Journey Pass', '661_Banda_animal': 'Animal Band', '662__nimos_del_FANDOM': 'FANDOM Cheer',
    '665_Moto': 'Motorcycle', '666_Sue_o_rosa': 'Pink Dream', '668_Autob_s_de_fiesta': 'Party Bus',
    '670_Osito_r_tmico': 'Rhythmic Bear', '672_Anillo_de_honor': 'Ring Of Honor-Cube', '673_Beb_de_criatura_sorpresa': 'Surprise Baby Mob',
    '674_Foco_de_subida_de_nivel': 'Level-up Spotlight', '677_Drifting': 'Sky Drift', '678_Lluvia_de_meteoritos': 'Meteor Shower',
    '679_Cuerno_de_invocaci_n': 'Summoning Horn', '680_Diny_en_el_mar': 'Sea Diny', '681_Tom_en_el_mar': 'Sea Tom',
    '682_Blitzy_en_el_mar': 'Sea Blitzy', '683_Cooper_en_el_mar': 'Sea Cooper', '684_Gallina_rapera': 'Hip-Hop Hen',
    '685_Levanta_la_vista': 'Look Up', '686_Sue_a_a_lo_grande': 'Dream Big', '687_Esqueleto_de_T-Rex_beb_': 'Dinosaur',
    '688_De_regreso_a_casa': 'Go Home', '689_Teclado_gaming': 'Game Controller', '691_Brilla_brillante': 'Shine Bright',
    '692_Mundo_m_gico': 'Magic World', '695_Tu_concierto': 'Your Concert', '696_Drag_n_de_fuego': 'Fiery Dragon',
    '697_Le_n_el_gatito': 'Leon the Kitten', '698_Jet_privado': 'Private Jet', '699_M_sica_din_mica': 'Dynamic Music',
    '700_Bigotes_de_az_car': 'Sugar Whiskers', '703_Nave_del_h_roe': 'Hero Space Ship', '704_La_aventura_de_Sage': 'Sages Venture',
    '705_Pistola_de_diamantes': 'Diamond Gun', '706_Aviones_volando': 'Flying Jets', '707_Afici_n_de_la_liga': 'League Fandom',
    '710_Capa_con_sellos_de_Leoncito': 'Leons Sigil Cape', '712_Unicornio_de_fantas_a': 'Unicorn Fantasy', '713_Amigos_peluditos': 'Furry Friends',
    '714_Lobo': 'Wolf', '716_Leoncito_en_las_nubes': 'Cub on Clouds', '717_Odisea_heroica': 'Valiant Odyssey',
    '718_Coraz_n_apasionado': 'Devoted Heart', '719_Final_por_todo_lo_alto': 'Strong Finish', '720_Trabaja_mucho_y_disfruta_a_n_m_s': 'Work Hard Play Harder',
    '721_Ciudad_del_futuro': 'Future City', '722_Estampida_de_pollitos': 'Chick Stampede', '724_Sam_en_la_nueva_ciudad': 'Sam in New City',
    '725_Leoparda_Lili': 'Lili the Leopard', '726_Hora_de_la_celebraci_n': 'Celebration Time', '727_Fiesta_animada': 'Happy Party',
    '729_Cisne_negro': 'Swan', '730_Coche_deportivo': 'Sports Car', '733_Majestic_Hearts': 'Majestic Hearts',
    '735_Trono_estelar': 'Star Throne', '736_El_FANDOM_definitivo': 'Ultimate FANDOM', '738_Leoncito_y_Lili': 'Leon and Lili',
    '740_Pulpo': 'Octopus', '741_Bulevar_del_ocaso': 'Sunset Speedway', '742_Interestelar': 'Interstellar',
    '744_Halc_n': 'Falcon', '747_Descapotable': 'Convertible car', '748_Rel_mpago_rojo': 'Red Lightning',
    '751_Espect_culo_de_subida_de_nivel': 'Level-up Spectacle', '752_Pase_de_verano_XL': 'Journey Pass', '753_Nave_espacial': 'TikTok Shuttle',
    '754_Martillo_invencible': 'Invincible Hammer', '755_Tridente_llamamareas': 'Tidecaller Trident', '756_Coraz_n_de_cristal': 'Crystal Heart',
    '757_Traves_a_interestelar': 'Interstellar', '760_Tiempo_en_familia': 'Time for Family', '761_Gran_semental': 'Stallion',
    '763_Que_siga_la_fiesta': 'Party OnOn', '764_Consola_de_videojuegos': 'Game Controller', '765_Futuro_viaje': 'Future Journey',
    '766_Pir_mides': 'Pyramids', '767_Rosa_c_smica': 'Rosa Nebula', '768_Leopardo': 'Leopard',
    '769_Campe_n_de_la_batalla': 'Battle Champion', '770_Jinete_escurridizo': 'Sneaky Jockey', '771_Par_s': 'Paris',
    '772_Cocodrilo': 'Crocodile', '773_Caballo_del_A_o_Nuevo_lunar': 'Golden Gallop', '774_Barco_pirata': 'Pirates ship',
    '776_Parque_de_atracciones': 'Amusement Park', '777_Amor_en_el_aire': 'Fly Love', '779_Transbordador': 'TikTok Shuttle',
    '780_Castillo_de_fantas_a': 'Castle Fantasy', '781_Transbordador_Premium': 'Premium Shuttle', '782_Delf_n': 'Dolphin',
    '783_Nave_de_nivel': 'Level Ship', '785_Coraz_n_infinito': 'Infinite Heart', '786_Tiranosaurio_rex': 'Dinosaur',
    '787_El_sue_o_de_Adam': 'Adams Dream', '788_F_nix': 'Phoenix', '789_Clamor_cibern_tico': 'Cyber Roar',
    '790_Reino_submarino': 'Undersea Kingdom', '791_Grifo': 'Pegasus', '793_Llama_de_drag_n': 'Dragon Flame',
    '794_Le_n': 'Lion', '795_Golazo': 'Goal', '796_Gorila': 'Gorilla',
    '797_Ballena_Sam': 'Sam the whale', '798_Gorilla': 'Gorilla', '801_Zeus': 'Zeus',
    '802_Leoncito_y_Le_n': 'Leon and Lion', '803_TikTok_Universe_': 'TikTok Universe', '804_TikTok_Stars': 'TikTok Stars',
    '805_Halc_n_de_trueno': 'Thunder Falcon', '806_F_nix_de_fuego': 'Fire Phoenix', '807_Legendario_Marcellus': 'Legend Marcellus',
    '808_Pegaso': 'Pegasus', '809_Julius_el_Campe_n': 'Julius the Champion', '810_TikTok_Universe': 'TikTok Universe',
}

def normalize(s):
    s = s.lower().replace('_', ' ').replace('-', ' ')
    s = re.sub(r'[^a-z0-9\s]', '', s)
    return s.strip()

def heuristic_lookup(base_name):
    lower = base_name.lower()
    if 'relmpago' in lower or 'rel_mpago' in lower:
        return 'Lightning Bolt', 1
    if 'patata' in lower or 'tomate' in lower:
        return 'Gamer Tater', 10
    if 'pase_de_verano' in lower:
        return 'Journey Pass', 10
    if 'cooper' in lower:
        return 'Cooper Flies Home', 1999
    if 'diny' in lower:
        return 'Tiny Diny Trek', 200
    if 'fuegos_artificiales' in lower or 'fuego_furioso' in lower:
        return 'Fireworks', 1088
    if 'cisne' in lower:
        return 'Swan', 699
    if 'galaxia' in lower:
        return 'Galaxy', 1000
    if 'meteorito' in lower or 'estrellas_fugaces' in lower:
        return 'Meteor Shower', 3000
    if 'corgi' in lower:
        if 'sakura' in lower or 'cerezo' in lower:
            return 'Sakura Corgi', 499
        if 'diente' in lower or 'taraxacum' in lower:
            return 'Taraxacum Corgi', 400
        return 'Corgi', 299
    if 'dragon' in lower or 't-rex' in lower or 'dinosaurio' in lower or 'tiranosaurio' in lower:
        return 'Dinosaur', 1000
    if 'fnix' in lower or 'phoenix' in lower:
        return 'Phoenix', 25999
    if 'coche_deportivo' in lower:
        return 'Sports Car', 7000
    if lower == 'moto' or lower.endswith('_moto'):
        return 'Motorcycle', 2988
    if 'jet_privado' in lower:
        return 'Private Jet', 4888
    if 'castillo' in lower:
        return 'Castle Fantasy', 20000
    if 'tren' in lower:
        return 'Train', 899
    if 'coraz' in lower:
        if 'manos' in lower or 'mano' in lower:
            return 'Hand Hearts', 100
        if 'nube' in lower or 'puff' in lower:
            return 'Heart Puff', 1
        if 'coreano' in lower:
            return 'Finger Heart', 5
        return 'Heart', 1
    if 'rosa' in lower:
        if 'eternidad' in lower or 'forever' in lower:
            return 'Forever Rosa', 399
        if 'blanca' in lower or 'primera' in lower:
            return 'My First Rose', 1
        return 'Rose', 1
    if 'guantes_de_boxeo' in lower:
        if 'dorado' in lower:
            return 'Gold Boxing Gloves', 10
        return 'Boxing Gloves', 299
    if 'bravo' in lower or 'aplauso' in lower:
        return 'Bravo', 15
    if 'confeti' in lower:
        return 'Confetti', 100
    if 'perfume' in lower:
        return 'Perfume', 20
    if 'oso' in lower and 'rosa' in lower:
        return 'Rose Bear', 214
    if 'delfin' in lower or 'delf_n' in lower:
        return 'Dolphin', 10
    if 'golazo' in lower or 'goal' in lower:
        return 'Goal', 500
    if 'bebe_drag' in lower or 'baby_dragon' in lower:
        return 'Baby Dragon', 2000
    if 'unicornio' in lower:
        return 'Unicorn Fantasy', 5000
    if 'leopardo' in lower or 'leopard' in lower:
        return 'Leopard', 15000
    if 'lobo' in lower:
        return 'Wolf', 5500
    if 'gorila' in lower:
        return 'Gorilla', 30000
    if 'zeus' in lower:
        return 'Zeus', 34000
    if 'transbordador' in lower or 'shuttle' in lower:
        return 'TikTok Shuttle', 20000
    if 'nave_espacial' in lower or 'spaceship' in lower:
        return 'TikTok Shuttle', 20000
    if 'hamster' in lower or 'h_mster' in lower:
        return 'Go Hamster', 299
    if 'saxofon' in lower or 'saxo' in lower:
        return 'Singing Sax', 399
    if 'gato' in lower and 'espacial' in lower:
        return 'Astrobear', 1500
    if 'gato' in lower:
        return 'Gamer Cat', 199
    if 'le_n' in lower and 'gatito' in lower:
        return 'Leon the Kitten', 4888
    if 'le_n' in lower:
        return 'Lion', 29999
    if 'tigre' in lower:
        return 'Lion', 29999
    if 'grifo' in lower:
        return 'Pegasus', 42999
    if 'silla_gaming' in lower:
        return 'Game Controller', 100
    if 'trofeo' in lower and 'ewc' in lower:
        return 'EWC Trophy', 1500
    if 'trofeo' in lower and 'liga' in lower:
        return 'League Trophy', 599
    if 'trofeo' in lower:
        return 'Award', 4500
    if 'coche_de_carreras' in lower:
        return 'Racing Debut', 1500
    if 'oso_negro' in lower:
        return 'Wolf', 5500
    if 'oso' in lower and 'surfista' in lower:
        return 'Cub on Clouds', 5888
    if 'oso' in lower and 'espacial' in lower:
        return 'Astrobear', 1500
    if 'oso' in lower:
        return 'Mishka Bear', 100
    if 'esqueleto' in lower and 'trex' in lower:
        return 'Dinosaur', 1000
    if 'pu_eto' in lower or 'pu_etazo' in lower:
        return 'Rockys Punch', 2199
    if 'lluvia_meteoritos' in lower or 'meteoritos' in lower:
        return 'Meteor Shower', 3000
    if 'abeja' in lower:
        return 'Stinging Bee', 199
    if 'caf' in lower or 'coffee' in lower:
        return 'Coffee Magic', 199
    if 'cactus' in lower:
        return 'Cactus Shuffle', 399
    if 'concha' in lower or 'shell' in lower:
        return 'Shell of a Warrior', 500
    if 'panda' in lower:
        return 'Panda Snap', 399
    if 'payaso' in lower:
        return 'Clown Boogie', 449
    if 'elefante' in lower:
        return 'Elephant trunk', 299
    if 'jirafa' in lower:
        return 'Gerry the Giraffe', 1000
    if 'maracas' in lower:
        return 'Beach Maracas', 349
    if 'flamenco' in lower:
        return 'Flamingo Groove', 1000
    if 'foca' in lower:
        return 'Cotton the Seal', 399
    if 'koala' in lower:
        return 'Cupid Koala', 450
    if 'nutria' in lower:
        return None, None
    if 'perro' in lower or 'perrito' in lower:
        return 'Puppy Kisses', 299
    if 'pollito' in lower:
        return 'Baby Chicks', 500
    if 'poll' in lower and 'stampede' in lower:
        return 'Chick Stampede', 6000
    if 'potato' in lower or 'patata' in lower:
        return 'Gamer Tater', 10
    if 'sorpresa_romantica' in lower or 'love_drop' in lower:
        return 'Love Drop', 1800
    if 'supermujer' in lower or 'superwoman' in lower:
        return 'Superwoman', 450
    if 'espectaculo_subida_nivel' in lower or 'levelup' in lower:
        return 'Level-up Spectacle', 12999
    if 'tarta' in lower or 'pastel' in lower or 'cake' in lower:
        return 'Cake Slice', 1
    if 'rbol' in lower and 'navidad' in lower:
        return 'Xmas Tree Hat', 449
    if 'capibara' in lower:
        return 'Capybara', 30
    if 'basket' in lower or 'baloncesto' in lower:
        return 'League Ball', 10
    return None, None

files = sorted([f for f in os.listdir('.') if f.lower().endswith('.png')])
results = []

for f in files:
    base = os.path.splitext(f)[0]
    mapped = NAME_MAP.get(base)
    if mapped and mapped in PRICES:
        price = PRICES[mapped]
        results.append({'filename': f, 'name': mapped, 'price': price})
        continue
    if mapped is None:
        name, price = heuristic_lookup(base)
        if name and price:
            results.append({'filename': f, 'name': name, 'price': price})
            continue
    results.append({'filename': f, 'name': mapped, 'price': None})

with open('gifts_prices.json', 'w', encoding='utf-8') as out:
    json.dump(results, out, ensure_ascii=False, indent=2)

print('Total items:', len(results))
print('Items with price:', sum(1 for r in results if r['price'] is not None))
print('Items without price:', sum(1 for r in results if r['price'] is None))
