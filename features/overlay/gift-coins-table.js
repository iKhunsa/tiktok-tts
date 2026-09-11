'use strict';

// Migracion EXACTA de TIKTOK_GIFT_COINS (backend-viejo/server.js:289-562).
const TIKTOK_GIFT_COINS = {
  // 1 coin
  'Rose': 1, 'Flame heart': 1, 'Love you so much': 1, 'Youre awesome': 1,
  'Heart Puff': 1, 'TikTok': 1, 'Wink wink': 1, 'Freestyle': 1, 'Oldies': 1,
  'Pop': 1, 'Cool': 1, 'My First Rose': 1, 'Heart': 1, 'Cake Slice': 1,
  'Lightning Bolt': 1, 'GOAT': 1, 'GG': 1, 'Ice Cream Cone': 1, 'Creeper': 1,
  'Congratulations': 1, 'So Cute': 1, 'Love you': 1, 'Music Album': 1,
  'coldy': 1, 'Red Lightning': 1, 'Blue Lightning': 1, 'Yellow Lightning': 1,
  'Wink Charm': 1, 'Go Popular': 1, 'Club Cheers': 1, 'Its corn': 1,
  // 2 coins
  'Team Bracelet': 2,
  // 5 coins
  'Overreact': 5, 'Finger Heart': 5, 'Name shoutout': 5, 'Gamer Level Up': 5,
  // 9 coins
  'Super Popular': 9, 'Club Power': 9,
  // 10 coins
  'Gamer Tater': 10, 'League Ball': 10, 'Journey Pass': 10, 'Slow motion': 10,
  'Gold Boxing Gloves': 10, 'Lucky Pony': 10, 'FANDOM Fan': 10, 'Chocolate': 10,
  'Style Me Up': 10, 'Banana Peel': 10, 'Heart Gaze': 10, 'Friendship Necklace': 10,
  'Dolphin': 10,
  // 15 coins
  'Bravo': 15,
  // 20 coins
  'Perfume': 20, 'Traffic Cone': 20,
  // 30 coins
  'Capybara': 30, 'You are my Jam': 30, 'Doughnut': 30, 'Energy Capsule': 30,
  // 88 coins
  'Butterfly': 88,
  // 90 coins
  'Fist Bump': 90,
  // 99 coins
  'Cupids Bow': 99, 'Sundae Bowl': 99, 'Mark of Love': 99, 'Bubble Gum': 99,
  'Love Painting': 99, 'Like-Pop': 99, 'Hat and Mustache': 99, 'Cap': 99,
  'Little Crown': 99, 'Paper Crane': 99, 'Greeting Heart': 99, 'Club Victory': 99,
  // 100 coins
  'Mishka Bear': 100, 'Hand Hearts': 100, 'Confetti': 100, 'FANDOM Stamp': 100,
  'Power Chip': 100, 'Singing Magic': 100, 'Marvelous Confetti': 100, 'Super GG': 100,
  'Game Controller': 100,
  // 149 coins
  'Fairy Hide': 149, 'Love Glasses': 149, 'Santa Cocoa': 149, 'Raving Snail': 149,
  'Catrina': 149, 'Caterpillar Chaos': 149, 'Feather Tiara': 149, 'Balloon Crown': 149,
  'Masquerade': 149, 'Chatting Popcorn': 149, 'Big Shout Out': 149, 'Bowknot': 149,
  // 150 coins
  'Potato Transformation': 150, 'Moonwalk': 150,
  // 199 coins
  'Party Pony': 199, 'Heart Hood': 199, 'Joker Ball': 199, 'Chirpy Kisses': 199,
  'Rose Hand': 199, 'Sour Buddy': 199, 'Flower Headband': 199, 'Floating Octopus': 199,
  'Cheering Crab': 199, 'Coffee Magic': 199, 'Massage for You': 199,
  'Stinging Bee': 199, 'Garland Headpiece': 199, 'Hearts': 199, 'Sunglasses': 199,
  'League Countdown': 199, 'Cheer For You': 199, 'Night Star': 199,
  'Twinkling Star': 199, 'Melon Juice': 199, 'Fan Cat': 199,
  'Gamer Cat': 199, 'Blow Bubbles': 199,
  // 200 coins
  'Magic Genie': 200, 'Gold Medal': 200, 'Tiny Diny Trek': 200,
  'I Love TikTok LIVE': 200,
  // 214 coins
  'Rose Bear': 214,
  // 249 coins
  'Amped Up': 249, 'Snow Bloom': 249, 'Sweet Flutter': 249, 'Dreamy Strings': 249,
  'Party Blossom': 249, 'Surfing Penguin': 249, 'Melodic birds': 249,
  'Treasured Voice': 249, 'Forest Elf': 249, 'Palm Breeze': 249,
  'Music Bubbles': 249, 'Cheer Mic': 249, 'Star Goggles': 249, 'Ice Cream Mic': 249,
  'Candy Bouquet': 249, 'Pinch Face': 249, 'Furry Friends': 249,
  // 299 coins
  'Boxing Gloves': 299, 'Sax Groove': 299, 'Wakey Mallow': 299, 'Spring Sprout': 299,
  'Pony Lantern': 299, 'Love Call': 299, 'Music Mate': 299, 'Penguin Snowpal': 299,
  'Melody Glasses': 299, 'Bat Headwear': 299, 'Go Hamster': 299, 'Hi Rosie': 299,
  'Kicker Challenge': 299, 'United Heart': 299, 'Puppy Kisses': 299,
  'Butterfly for You': 299, 'Rock Star': 299, 'Play for You': 299,
  'Naughty Chicken': 299, 'Fruit Friends': 299, 'Elephant trunk': 299,
  'Corgi': 299, 'LIVE Ranking Crown': 299, 'EID Gift Box': 299, 'Scroll': 299,
  'Budding Heart': 299, 'Journal': 299,
  // 300 coins
  'Feather Mask': 300, 'Air Dancer': 300,
  // 349 coins
  'Vinyl Flip': 349, 'Beach Maracas': 349, 'Spring Bouquet': 349, 'Sparkle Pony': 349,
  'Rocking Shroom': 349, 'Gingerbread Man': 349, 'Vintage flight': 349,
  'Mystic Drink': 349, 'Batwing Hat': 349, 'Become Kitten': 349,
  'Festival Bracelet': 349,
  // 398 coins
  'Singing Frogs': 398,
  // 399 coins
  'Alien Buddy': 399, 'Panda Snap': 399, 'Cactus Shuffle': 399, 'Vocal Bear': 399,
  'Dreamy Hat': 399, 'Blossom Fairy': 399, 'Fairy Locket': 399, 'Singing Sax': 399,
  'Confetti Bear': 399, 'Santa Owl Surprise': 399, 'Tiger Lift': 399,
  'Rosies Concert': 399, 'Shoot the Apple': 399, 'Kitten Kneading': 399,
  'Let butterfly dances': 399, 'Sage the Smart Bean': 399, 'Rocky the Rock Bean': 399,
  'Jollie the Joy Bean': 399, 'Rosie the Rose Bean': 399, 'Toms Hug': 399,
  'Relaxed Goose': 399, 'Magic Rhythm': 399, 'Forever Rosa': 399,
  'Cotton the Seal': 399, 'Sages Slash': 399, 'Health Potion': 399,
  'Flower flight': 399, 'You Are Loved': 399,
  // 400 coins
  'DJ Wave': 400, 'Cheeky Pup': 400, 'Reindeer Milk': 400, 'Taraxacum Corgi': 400,
  'Bounce Speakers': 400, 'Mic Champ': 400, 'Wishing Cake': 400,
  'Crystal Dreams': 400, 'FANDOM Fever': 400,
  // 449 coins
  'Clown Boogie': 449, 'Xmas Tree Hat': 449, 'Space Love': 449, 'Batting Cutie': 449,
  'Captured Vocals': 449, 'Candy Loot': 449, 'Pirates Treasure': 449,
  'Encore Clap': 449, 'Beating Heart': 449,
  // 450 coins
  'Sloth Peek': 450, 'Clover Hat': 450, 'Superwoman': 450, 'Paw Call': 450,
  'Cupid Koala': 450, 'City Pop': 450, 'Celebration Hat': 450,
  'Music Conductor': 450, 'Halloween Fun Hat': 450, 'Hat of Joy': 450,
  'Powerful Mind': 450,
  // 499 coins
  'Panda Hug': 499, 'Sakura Corgi': 499, 'Coral': 499, 'Hands Up': 499,
  // 500 coins
  'Diamond Microphone': 500, 'Starry Fluff': 500, 'Heart Guitar': 500,
  'Mystery Box': 500, 'Cozy Xmas Set': 500, 'Prince': 500, 'Bunny Crown': 500,
  'Flower Show': 500, 'XXXL Flowers': 500, 'Dragon Crown': 500, 'Couch Potato': 500,
  'Manifesting': 500, 'DJ Glasses': 500, 'VR Goggles': 500, 'Youre Amazing': 500,
  'Money Gun': 500, 'Baby Chicks': 500, 'Magic Prop': 500, 'Prairie Diny': 500,
  'Prairie Tom': 500, 'Prairie Blitzy': 500, 'Prairie Cooper': 500,
  'Jungle Diny': 500, 'Jungle Tom': 500, 'Jungle Blitzy': 500, 'Jungle Cooper': 500,
  'Gem Gun': 500, 'Star Map Polaris': 500, 'Bouquet': 500, 'Gardening': 500,
  'Racing Helmet': 500, 'Shell of a Warrior': 500, 'Goal': 500,
  // 549 coins
  'Drum Hamster': 549, 'Hive Escape': 549,
  // 599 coins
  'League Trophy': 599, 'Fully Bloomed Sakura': 599,
  // 649 coins
  'Seahorse Pop': 649,
  // 699 coins
  'Swan': 699,
  // 700 coins
  'Colorful Wings': 700,
  // 800 coins
  'Love Flight': 800,
  // 899 coins
  'Train': 899,
  // 999 coins
  'Travel with You': 999, 'Lucky Airdrop Box': 999, 'Trending Figure': 999,
  // 1000 coins
  'Dinosaur': 1000, 'Fairy Wings': 1000, 'Flamingo Groove': 1000, 'Galaxy': 1000,
  'Firepit Diny': 1000, 'Firepit Tom': 1000, 'Firepit Blitzy': 1000,
  'Firepit Cooper': 1000, 'Desert Diny': 1000, 'Desert Tom': 1000,
  'Desert Blitzy': 1000, 'Desert Cooper': 1000, 'Tundra Diny': 1000,
  'Tundra Tom': 1000, 'Tundra Blitzy': 1000, 'Tundra Cooper': 1000,
  'Magic Potion': 1000, 'Sparkle Dance': 1000, 'Shiny air balloon': 1000,
  'Watermelon Love': 1000, 'Joy Floats': 1030, 'Blooming Ribbons': 1000,
  'Glowing Jellyfish': 1000, 'Gerry the Giraffe': 1000, 'Disco ball': 1000,
  'Super LIVE Star': 1000,
  // 1088 coins
  'Fireworks': 1088, 'Magic Role': 1088,
  // 1099 coins
  'Diamond': 1099,
  // 1200 coins
  'Umbrella of Love': 1200,
  // 1300 coins
  'Party Laser': 1300,
  // 1400 coins
  'Vibrant Stage': 1400,
  // 1500 coins
  'EWC Trophy': 1500, 'Galaxy Globe': 1500, 'Wild Mic': 1500, 'Racing Debut': 1500,
  'Astrobear': 1500, 'Under Control': 1500, 'Future Encounter': 1500,
  'Greeting Card': 1500, 'Lovers Lock': 1500, 'Chasing the Dream': 1500,
  'Level Ship': 1500, 'Raya Gift Card': 1500, 'Viking Hammer': 1500,
  'Youre So Fly': 1500,
  // 1599 coins
  'Blooming Heart': 1599,
  // 1799 coins
  'Here We Go': 1799,
  // 1800 coins
  'Fox Legend': 1800, 'Love Drop': 1800,
  // 1999 coins
  'Mystery Firework': 1999, 'Cooper Flies Home': 1999,
  'Doll New Year Greeting': 1999, 'Star of Red Carpet': 1999, 'Egg Hunt': 1999,
  // 2000 coins
  'Club Music': 2000, 'Crystal Crown': 2000, 'Baby Dragon': 2000, 'Sky Drift': 2000,
  // 2150 coins
  'Whale Diving': 2150,
  // 2199 coins
  'Sages Coinbot': 2199, 'Rockys Punch': 2199, 'Blow Rosie Kisses': 2199,
  // 2200 coins
  'Wave Lights': 2200,
  // 2500 coins
  'Animal Band': 2500, 'FANDOM Cheer': 2500,
  // 2988 coins
  'Motorcycle': 2988, 'Pink Dream': 2988,
  // 2999 coins
  'Party Bus': 2999, 'Rhythmic Bear': 2999, 'Ring Of Honor-Cube': 2999,
  'Surprise Baby Mob': 2999, 'Level-up Spotlight': 2999,
  // 3000 coins
  'Meteor Shower': 3000, 'Summoning Horn': 3000,
  // 3088 coins
  'Sea Diny': 3088, 'Sea Tom': 3088, 'Sea Blitzy': 3088, 'Sea Cooper': 3088,
  // 3200 coins
  'Hip-Hop Hen': 3200,
  // 3350 coins
  'Look Up': 3350, 'Dream Big': 3350,
  // 3999 coins
  'Go Home': 3999,
  // 4088 coins
  'Shine Bright': 4088,
  // 4500 coins
  'Your Concert': 4500, 'Award': 4500,
  // 4888 coins
  'Fiery Dragon': 4888, 'Leon the Kitten': 4888, 'Private Jet': 4888,
  'Dynamic Music': 4888,
  // 4918 coins
  'Sugar Whiskers': 4918,
  // 4999 coins
  'Hero Space Ship': 4999, 'Sages Venture': 4999,
  // 5000 coins
  'Diamond Gun': 5000, 'Flying Jets': 5000, 'League Fandom': 5000,
  'Leons Sigil Cape': 5000, 'Unicorn Fantasy': 5000,
  // 5500 coins
  'Wolf': 5500,
  // 5888 coins
  'Cub on Clouds': 5888, 'Valiant Odyssey': 5888,
  // 5999 coins
  'Devoted Heart': 5999,
  // 6000 coins
  'Strong Finish': 6000, 'Work Hard Play Harder': 6000, 'Future City': 6000,
  'Chick Stampede': 6000, 'Sam in New City': 6000,
  // 6599 coins
  'Lili the Leopard': 6599,
  // 6999 coins
  'Celebration Time': 6999, 'Happy Party': 6999,
  // 7000 coins
  'Sports Car': 7000,
  // 7238 coins
  'Majestic Hearts': 7238,
  // 7999 coins
  'Star Throne': 7999,
  // 8000 coins
  'Ultimate FANDOM': 8000,
  // 9699 coins
  'Leon and Lili': 9699,
  // 10000 coins
  'Octopus': 10000, 'Sunset Speedway': 10000, 'Interstellar': 10000,
  // 10999 coins
  'Falcon': 10999,
  // 12000 coins
  'Convertible car': 12000,
  // 12999 coins
  'Level-up Spectacle': 12999,
  // 14999 coins
  'Invincible Hammer': 14999, 'Tidecaller Trident': 14999, 'Crystal Heart': 14999,
  // 15000 coins
  'Time for Family': 15000, 'Stallion': 15000, 'Party OnOn': 15000,
  'Future Journey': 15000, 'Pyramids': 15000, 'Rosa Nebula': 15000,
  'Leopard': 15000, 'Battle Champion': 15000, 'Sneaky Jockey': 15000,
  'Paris': 15000, 'Crocodile': 15000, 'Golden Gallop': 15000, 'Pirate ship': 15000,
  // 17000 coins
  'Amusement Park': 17000,
  // 19999 coins
  'Fly Love': 19999,
  // 20000 coins
  'TikTok Shuttle': 20000, 'Castle Fantasy': 20000, 'Premium Shuttle': 20000,
  // 23999 coins
  'Infinite Heart': 23999,
  // 25999 coins
  'Adams Dream': 25999, 'Phoenix': 25999, 'Cyber Roar': 25999,
  'Undersea Kingdom': 25999, 'Griffin': 25999,
  // 26999 coins
  'Dragon Flame': 26999,
  // 29999 coins
  'Lion': 29999,
  // 30000 coins
  'Gorilla': 30000, 'Sam the whale': 30000,
  // 34000 coins
  'Zeus': 34000, 'Leon and Lion': 34000,
  // 39999 coins
  'TikTok Stars': 39999, 'Thunder Falcon': 39999,
  // 41999 coins
  'Fire Phoenix': 41999,
  // 42999 coins
  'Legend Marcellus': 42999, 'Pegasus': 42999,
  // 43999 coins
  'Julius the Champion': 43999,
  // 44999 coins
  'TikTok Universe': 44999,
};

module.exports = { TIKTOK_GIFT_COINS };
