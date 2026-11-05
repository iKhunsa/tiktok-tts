/**
 * Regalos de YouTube (se pagan con joyas) y su imagen en el CDN de YouTube, como [id, joyas].
 * Copiado del panel "Enviar regalo" del chat en vivo el 2026-11-02: YouTube agrega y retira
 * regalos (los de temporada son por tiempo limitado), asi que la lista puede quedar atrasada.
 * Las imagenes no viajan en el instalador: se cargan del CDN, como los cheermotes de Twitch.
 */
export const REGALOS_YOUTUBE = [
  ['silver_star_v2_320x320', 2], ['sparkles_v2_320x320', 2], ['go_team', 5], ['treat', 5], ['chili_v2_320x320', 6], ['makeup_brush_v2_320x320', 6],
  ['glhf', 10], ['gold_coin_v2_320x320', 10], ['good_game_v2_320x320', 10], ['happy_poop_v2_320x320', 10], ['hiding', 10], ['keep_it_up', 10],
  ['love_is_in_the_air', 10], ['press_f', 10], ['w_key', 10], ['garlic', 20], ['ggez', 20], ['party_hat_320x320', 20],
  ['pepero_heart_eyes', 20], ['pepero_yummy', 20], ['clutch', 30], ['one_of_a_kind', 30], ['fox_donut', 60], ['six_seven', 67],
  ['clock_it', 80], ['hi_there', 100], ['high_five', 100], ['one_hundred_v2_320x320', 100], ['sweet_treat', 100], ['pepero_look_at_me', 111],
  ['pepero_so_sweet', 111], ['pepero_thats_nuts', 111], ['cat_jammin', 200], ['flow_state', 200], ['question_mark', 200], ['gg_gravestone', 250],
  ['lol', 250], ['mvp_crown', 250], ['rock_on', 250], ['saxophone', 250], ['seal_of_approval', 250], ['girl_power', 300],
  ['pepero_boop', 311], ['pepero_heart_attack', 311], ['finger_heart', 350], ['fortune_cookie', 380], ['unc_alert', 440], ['blowfish', 450],
  ['foam_finger', 450], ['controller', 500], ['delulu', 500], ['party_time', 500], ['power_potion', 500], ['whats_up', 500],
  ['shopping_cart', 550], ['stay_hydrated', 550], ['latte', 600], ['mic_drop', 600], ['surprise', 650], ['youve_got_mail', 650],
  ['football', 750], ['let_em_cook', 750], ['squirrel_cup', 750], ['gg_keys', 800], ['husky', 800], ['turn_it_up', 800],
  ['ramen_bowl', 900], ['air_travel', 1000], ['best_boos', 1000], ['coffee_on_me', 1000], ['corgi', 1000], ['gamer_ghost', 1000],
  ['get_loud', 1000], ['goat_trophy', 1000], ['its_cake', 1000], ['loot_box', 1000], ['w_pinata', 1000], ['witch_cat', 1000],
  ['nacho', 1200], ['great_job', 1500], ['headliner', 1500], ['heart_you', 1500], ['tube_dancer', 1500], ['spill_the_tea', 1600],
  ['appreciate_you', 2500], ['aura_farming', 2500], ['bravo', 2500], ['skull_dance', 2500], ['big_celebration', 3000], ['headphones', 3600],
  ['hound', 3800], ['mage', 4200], ['biscuit_tin', 5000], ['falling_leaves', 5000], ['sushi', 5500], ['hotpot', 6800],
  ['big_high_five', 7000], ['guitar', 7800], ['sports_car', 9500], ['limo', 10000], ['super_gg', 10000], ['trifle_smash', 10000],
  ['ball_party', 12000], ['clapping_seal', 12000], ['matsuri', 12000], ['gamer_corgi', 15000], ['tokyo_night', 15000], ['night_market', 15500],
  ['idol_life', 17000], ['trophy_cake', 17000], ['castle', 18000], ['happy_birthday_jp', 20000], ['racing_game', 20000], ['seaside', 22500],
];

export const imagenRegaloYoutube = (id) => `https://www.gstatic.com/youtube/img/pdg/gift/assets/${id}.png=w160-h160`;
