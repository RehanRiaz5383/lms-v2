import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'],
  'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
  'Food & Drink': ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧃', '🧉', '🧊'],
  'Activity': ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '🥍', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹‍♀️', '🤹', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
  'Travel & Places': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🛎️', '🧳', '⌛️', '⏳', '⌚️', '⏰', '⏱️', '⏲️', '🕰️', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦'],
  'Objects': ['💎', ' gem', '👓', '🕶️', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '👙', '👚', '👛', '👜', '👝', '🛍️', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '⛑️', '📿', '💄', '💍', '💎', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '📻', '📡', '📱', '📞', '☎️', '📟', '📠', '📺', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📷', '📸', '📹', '🎥', '📽️', '🎞️'],
  'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❓', '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩️', '⏪️', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '⚪️', '⚫️', '🔴', '🔵', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '▪️', '▫️', '◾️', '◽️', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛️', '⬜️', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛️', '⬜️', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
};

// Create a flat list of all emojis with their categories for search
const getAllEmojis = () => {
  const allEmojis = [];
  Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
    emojis.forEach((emoji) => {
      allEmojis.push({ emoji, category });
    });
  });
  return allEmojis;
};

// Simple emoji keyword mapping for search
const EMOJI_KEYWORDS = {
  '😀': ['smile', 'happy', 'grinning', 'face'],
  '😃': ['smile', 'happy', 'grinning', 'big', 'eyes'],
  '😄': ['smile', 'happy', 'grinning', 'laugh'],
  '😁': ['smile', 'happy', 'grinning', 'teeth'],
  '😆': 'laugh happy smile',
  '😅': 'sweat happy smile',
  '😂': 'laugh tears crying happy',
  '🤣': 'laugh rolling floor',
  '😊': 'smile happy blush',
  '😇': 'angel halo smile',
  '🙂': 'smile slight',
  '🙃': 'upside down smile',
  '😉': 'wink',
  '😌': 'relieved calm',
  '😍': 'love heart eyes',
  '🥰': 'love heart smile',
  '😘': 'kiss',
  '😗': 'kiss',
  '😙': 'kiss smile',
  '😚': 'kiss blush',
  '😋': 'yum delicious',
  '😛': 'tongue',
  '😝': 'tongue silly',
  '😜': 'tongue wink',
  '🤪': 'crazy',
  '🤨': 'raised eyebrow',
  '🧐': 'monocle',
  '🤓': 'nerd glasses',
  '😎': 'cool sunglasses',
  '🤩': 'star eyes',
  '🥳': 'party celebration',
  '😏': 'smirk',
  '😒': 'unamused',
  '😞': 'disappointed',
  '😔': 'sad pensive',
  '😟': 'worried',
  '😕': 'confused',
  '🙁': 'slight frown',
  '☹️': 'frown',
  '😣': 'persevere',
  '😖': 'confounded',
  '😫': 'tired',
  '😩': 'weary',
  '🥺': 'pleading',
  '😢': 'cry sad',
  '😭': 'cry sob',
  '😤': 'triumph',
  '😠': 'angry',
  '😡': 'angry red',
  '🤬': 'swear',
  '🤯': 'exploding head',
  '😳': 'flushed',
  '🥵': 'hot',
  '🥶': 'cold',
  '😱': 'scream fear',
  '😨': 'fear',
  '😰': 'anxious',
  '😥': 'sad relieved',
  '😓': 'sweat',
  '❤️': 'heart red love',
  '🧡': 'heart orange',
  '💛': 'heart yellow',
  '💚': 'heart green',
  '💙': 'heart blue',
  '💜': 'heart purple',
  '🖤': 'heart black',
  '🤍': 'heart white',
  '🤎': 'heart brown',
  '💔': 'heart broken',
  '❣️': 'heart exclamation',
  '💕': 'hearts two',
  '💞': 'hearts revolving',
  '💓': 'heart beating',
  '💗': 'heart growing',
  '💖': 'heart sparkling',
  '💘': 'heart arrow',
  '💝': 'heart ribbon',
  '💟': 'heart decoration',
  '🐶': 'dog puppy',
  '🐱': 'cat',
  '🐭': 'mouse',
  '🐹': 'hamster',
  '🐰': 'rabbit bunny',
  '🦊': 'fox',
  '🐻': 'bear',
  '🐼': 'panda',
  '🐨': 'koala',
  '🐯': 'tiger',
  '🦁': 'lion',
  '🐮': 'cow',
  '🐷': 'pig',
  '🐽': 'pig nose',
  '🐸': 'frog',
  '🐵': 'monkey',
  '🙈': 'monkey see no evil',
  '🙉': 'monkey hear no evil',
  '🙊': 'monkey speak no evil',
  '🍎': 'apple red',
  '🍏': 'apple green',
  '🍐': 'pear',
  '🍊': 'orange',
  '🍋': 'lemon',
  '🍌': 'banana',
  '🍉': 'watermelon',
  '🍇': 'grapes',
  '🍓': 'strawberry',
  '🍈': 'melon',
  '🍒': 'cherry',
  '🍑': 'peach',
  '🥭': 'mango',
  '🍍': 'pineapple',
  '🥥': 'coconut',
  '🥝': 'kiwi',
  '🍅': 'tomato',
  '🍆': 'eggplant',
  '🥑': 'avocado',
  '🥦': 'broccoli',
  '🥬': 'leafy green',
  '🥒': 'cucumber',
  '🌶️': 'pepper hot',
  '🌽': 'corn',
  '🥕': 'carrot',
  '🥔': 'potato',
  '🍠': 'sweet potato',
  '🥐': 'croissant',
  '🥯': 'bagel',
  '🍞': 'bread',
  '🥖': 'baguette',
  '🥨': 'pretzel',
  '🧀': 'cheese',
  '🥚': 'egg',
  '🍳': 'cooking',
  '🥞': 'pancake',
  '🥓': 'bacon',
  '🥩': 'meat',
  '🍗': 'chicken leg',
  '🍖': 'meat bone',
  '🌭': 'hot dog',
  '🍔': 'burger hamburger',
  '🍟': 'fries',
  '🍕': 'pizza',
  '🥪': 'sandwich',
  '🥙': 'stuffed flatbread',
  '🌮': 'taco',
  '🌯': 'burrito',
  '🥗': 'salad',
  '🥘': 'paella',
  '🥫': 'canned food',
  '🍝': 'spaghetti',
  '🍜': 'steaming bowl',
  '🍲': 'pot food',
  '🍛': 'curry rice',
  '🍣': 'sushi',
  '🍱': 'bento',
  '🥟': 'dumpling',
  '🍤': 'fried shrimp',
  '🍙': 'rice ball',
  '🍚': 'rice',
  '🍘': 'rice cracker',
  '🍥': 'fish cake',
  '🥠': 'fortune cookie',
  '🥮': 'moon cake',
  '🍢': 'oden',
  '🍡': 'dango',
  '🍧': 'shaved ice',
  '🍨': 'ice cream',
  '🍦': 'soft ice cream',
  '🥧': 'pie',
  '🍰': 'cake',
  '🎂': 'birthday cake',
  '🍮': 'custard',
  '🍭': 'lollipop',
  '🍬': 'candy',
  '🍫': 'chocolate',
  '🍿': 'popcorn',
  '🍩': 'donut',
  '🍪': 'cookie',
  '🌰': 'chestnut',
  '🥜': 'peanuts',
  '🍯': 'honey',
  '🥛': 'milk',
  '🍼': 'baby bottle',
  '☕️': 'coffee',
  '🍵': 'tea',
  '🥤': 'drink cup',
  '🍶': 'sake',
  '🍺': 'beer',
  '🍻': 'beers',
  '🥂': 'champagne',
  '🍷': 'wine',
  '🥃': 'tumbler',
  '🍸': 'cocktail',
  '🍹': 'tropical drink',
  '🚗': 'car',
  '🚕': 'taxi',
  '🚙': 'suv',
  '🚌': 'bus',
  '🚎': 'trolleybus',
  '🏎️': 'racing car',
  '🚓': 'police car',
  '🚑': 'ambulance',
  '🚒': 'fire engine',
  '🚐': 'van',
  '🚚': 'truck',
  '🚛': 'articulated lorry',
  '🚜': 'tractor',
  '🛴': 'scooter',
  '🚲': 'bike bicycle',
  '🛵': 'motor scooter',
  '🏍️': 'motorcycle',
  '✈️': 'airplane',
  '🚁': 'helicopter',
  '🚀': 'rocket',
  '🛸': 'ufo',
  '⚽️': 'soccer football',
  '🏀': 'basketball',
  '🏈': 'american football',
  '⚾️': 'baseball',
  '🥎': 'softball',
  '🎾': 'tennis',
  '🏐': 'volleyball',
  '🏉': 'rugby',
  '🥏': 'flying disc',
  '🎱': 'pool',
  '🏓': 'ping pong',
  '🏸': 'badminton',
  '🥅': 'goal',
  '🏒': 'ice hockey',
  '🏑': 'field hockey',
  '🏏': 'cricket',
  '🥍': 'lacrosse',
  '🏹': 'bow arrow',
  '🎣': 'fishing',
  '🥊': 'boxing',
  '🥋': 'martial arts',
  '🎽': 'running shirt',
  '🛹': 'skateboard',
  '🛷': 'sled',
  '⛸️': 'ice skate',
  '🥌': 'curling',
  '🎿': 'skis',
  '⛷️': 'skier',
  '🏂': 'snowboarder',
  '🏆': 'trophy',
  '🥇': 'gold medal',
  '🥈': 'silver medal',
  '🥉': 'bronze medal',
  '🏅': 'medal',
  '🎖️': 'military medal',
  '🎫': 'ticket',
  '🎟️': 'admission ticket',
  '🎪': 'circus',
  '🎭': 'theater',
  '🎨': 'art palette',
  '🎬': 'clapper',
  '🎤': 'microphone',
  '🎧': 'headphone',
  '🎼': 'musical score',
  '🎹': 'piano',
  '🥁': 'drum',
  '🎷': 'saxophone',
  '🎺': 'trumpet',
  '🎸': 'guitar',
  '🎻': 'violin',
  '🎲': 'dice',
  '♟️': 'chess pawn',
  '🎯': 'dart target',
  '🎳': 'bowling',
  '🎮': 'video game',
  '🎰': 'slot machine',
  '💎': 'diamond gem',
  '👓': 'glasses',
  '🕶️': 'sunglasses',
  '🥽': 'goggles',
  '👔': 'necktie',
  '👕': 'shirt',
  '👖': 'jeans',
  '🧣': 'scarf',
  '🧤': 'gloves',
  '🧥': 'coat',
  '🧦': 'socks',
  '👗': 'dress',
  '👘': 'kimono',
  '👙': 'bikini',
  '👚': 'womans clothes',
  '👛': 'purse',
  '👜': 'handbag',
  '👝': 'clutch',
  '🛍️': 'shopping',
  '🎒': 'backpack',
  '👞': 'mans shoe',
  '👟': 'running shoe',
  '🥾': 'hiking boot',
  '🥿': 'flat shoe',
  '👠': 'high heel',
  '👡': 'sandal',
  '👢': 'boot',
  '👑': 'crown',
  '👒': 'womans hat',
  '🎩': 'top hat',
  '🎓': 'graduation cap',
  '🧢': 'billed cap',
  '⛑️': 'rescue helmet',
  '📿': 'prayer beads',
  '💄': 'lipstick',
  '💍': 'ring',
  '📱': 'mobile phone',
  '📞': 'telephone',
  '☎️': 'phone',
  '📟': 'pager',
  '📠': 'fax',
  '📺': 'tv television',
  '📷': 'camera',
  '📸': 'camera flash',
  '📹': 'video camera',
  '🎥': 'movie camera',
  '📽️': 'film projector',
  '🎞️': 'film frames',
  '📻': 'radio',
  '📡': 'satellite',
  '🔇': 'mute speaker',
  '🔈': 'speaker low',
  '🔉': 'speaker medium',
  '🔊': 'speaker loud',
  '📢': 'megaphone',
  '📣': 'cheering megaphone',
  '🔔': 'bell',
  '🔕': 'bell slash',
  '❌': 'cross mark',
  '⭕️': 'heavy circle',
  '🛑': 'stop sign',
  '⛔️': 'no entry',
  '📛': 'name badge',
  '🚫': 'prohibited',
  '💯': 'hundred',
  '💢': 'anger',
  '♨️': 'hot springs',
  '🚷': 'no pedestrians',
  '🚯': 'no littering',
  '🚳': 'no bicycles',
  '🚱': 'non potable water',
  '🔞': 'no one under 18',
  '📵': 'no mobile phones',
  '🚭': 'no smoking',
  '❗️': 'exclamation',
  '❓': 'question',
  '❕': 'white exclamation',
  '❔': 'white question',
  '‼️': 'double exclamation',
  '⁉️': 'exclamation question',
  '🔅': 'low brightness',
  '🔆': 'high brightness',
  '〽️': 'part alternation',
  '⚠️': 'warning',
  '🚸': 'children crossing',
  '🔱': 'trident',
  '⚜️': 'fleur de lis',
  '🔰': 'beginner',
  '♻️': 'recycle',
  '✅': 'check mark',
  '🈯️': 'reserved',
  '💹': 'chart increasing',
  '❇️': 'sparkle',
  '✳️': 'eight spoked asterisk',
  '❎': 'cross mark button',
  '🌐': 'globe meridians',
  '💠': 'diamond dot',
  'Ⓜ️': 'circled m',
  '🌀': 'cyclone',
  '💤': 'zzz sleep',
  '🏧': 'atm',
  '🚾': 'water closet',
  '♿️': 'wheelchair',
  '🅿️': 'parking',
  '🈳': 'vacant',
  '🈂️': 'service charge',
  '🛂': 'passport control',
  '🛃': 'customs',
  '🛄': 'baggage claim',
  '🛅': 'left luggage',
  '🚹': 'mens room',
  '🚺': 'womens room',
  '🚼': 'baby symbol',
  '🚻': 'restroom',
  '🚮': 'litter bin',
  '🎦': 'cinema',
  '📶': 'signal strength',
  '🈁': 'koko',
  '🔣': 'input symbols',
  'ℹ️': 'information',
  '🔤': 'input latin uppercase',
  '🔡': 'input latin lowercase',
  '🔠': 'input latin letters',
  '🆖': 'ng',
  '🆗': 'ok',
  '🆙': 'up',
  '🆒': 'cool',
  '🆕': 'new',
  '🆓': 'free',
  '0️⃣': 'zero',
  '1️⃣': 'one',
  '2️⃣': 'two',
  '3️⃣': 'three',
  '4️⃣': 'four',
  '5️⃣': 'five',
  '6️⃣': 'six',
  '7️⃣': 'seven',
  '8️⃣': 'eight',
  '9️⃣': 'nine',
  '🔟': 'keycap ten',
  '🔢': 'input numbers',
  '#️⃣': 'hash',
  '*️⃣': 'asterisk',
  '▶️': 'play',
  '⏸️': 'pause',
  '⏯️': 'play pause',
  '⏹️': 'stop',
  '⏺️': 'record',
  '⏭️': 'next track',
  '⏮️': 'previous track',
  '⏩️': 'fast forward',
  '⏪️': 'rewind',
  '⏫': 'fast up',
  '⏬': 'fast down',
  '◀️': 'reverse',
  '🔼': 'up button',
  '🔽': 'down button',
  '➡️': 'right arrow',
  '⬅️': 'left arrow',
  '⬆️': 'up arrow',
  '⬇️': 'down arrow',
  '↗️': 'up right arrow',
  '↘️': 'down right arrow',
  '↙️': 'down left arrow',
  '↖️': 'up left arrow',
  '↕️': 'up down arrow',
  '↔️': 'left right arrow',
  '↪️': 'right arrow curving left',
  '↩️': 'left arrow curving right',
  '⤴️': 'right arrow curving up',
  '⤵️': 'right arrow curving down',
  '🔀': 'shuffle',
  '🔁': 'repeat',
  '🔂': 'repeat one',
  '🔄': 'counterclockwise',
  '🔃': 'clockwise',
  '🎵': 'musical note',
  '🎶': 'musical notes',
  '➕': 'plus',
  '➖': 'minus',
  '➗': 'divide',
  '✖️': 'multiply',
  '💲': 'dollar',
  '💱': 'currency exchange',
  '™️': 'trade mark',
  '©️': 'copyright',
  '®️': 'registered',
  '〰️': 'wavy dash',
  '➰': 'curly loop',
  '➿': 'double curly loop',
  '🔚': 'end',
  '🔙': 'back',
  '🔛': 'on',
  '🔝': 'top',
  '🔜': 'soon',
  '✔️': 'check mark',
  '☑️': 'check box',
  '🔘': 'radio button',
  '⚪️': 'white circle',
  '⚫️': 'black circle',
  '🔴': 'red circle',
  '🔵': 'blue circle',
  '🔶': 'orange diamond',
  '🔷': 'blue diamond',
  '🔸': 'small orange diamond',
  '🔹': 'small blue diamond',
  '🔺': 'red triangle up',
  '🔻': 'red triangle down',
  '🔳': 'white square button',
  '🔲': 'black square button',
  '▪️': 'black small square',
  '▫️': 'white small square',
  '◾️': 'black medium small square',
  '◽️': 'white medium small square',
  '◼️': 'black medium square',
  '◻️': 'white medium square',
  '🟥': 'red square',
  '🟧': 'orange square',
  '🟨': 'yellow square',
  '🟩': 'green square',
  '🟦': 'blue square',
  '🟪': 'purple square',
  '🟫': 'brown square',
  '⬛️': 'black large square',
  '⬜️': 'white large square',
  '👁️‍🗨️': 'eye speech bubble',
  '💬': 'speech balloon',
  '💭': 'thought balloon',
  '🗯️': 'right anger bubble',
  '♠️': 'spade suit',
  '♣️': 'club suit',
  '♥️': 'heart suit',
  '♦️': 'diamond suit',
  '🃏': 'joker',
  '🎴': 'flower playing cards',
  '🀄️': 'mahjong',
  '🕐': 'one oclock',
  '🕑': 'two oclock',
  '🕒': 'three oclock',
  '🕓': 'four oclock',
  '🕔': 'five oclock',
  '🕕': 'six oclock',
  '🕖': 'seven oclock',
  '🕗': 'eight oclock',
  '🕘': 'nine oclock',
  '🕙': 'ten oclock',
  '🕚': 'eleven oclock',
  '🕛': 'twelve oclock',
  '🕜': 'one thirty',
  '🕝': 'two thirty',
  '🕞': 'three thirty',
  '🕟': 'four thirty',
  '🕠': 'five thirty',
  '🕡': 'six thirty',
  '🕢': 'seven thirty',
  '🕣': 'eight thirty',
  '🕤': 'nine thirty',
  '🕥': 'ten thirty',
  '🕦': 'eleven thirty',
  '🕧': 'twelve thirty',
};

// Get search keywords for an emoji
const getEmojiKeywords = (emoji) => {
  const keywords = EMOJI_KEYWORDS[emoji];
  if (typeof keywords === 'string') {
    return keywords.toLowerCase();
  }
  if (Array.isArray(keywords)) {
    return keywords.join(' ').toLowerCase();
  }
  return '';
};

const EmojiPicker = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return null; // Return null to show categories
    }

    const query = searchQuery.toLowerCase().trim();
    const allEmojis = getAllEmojis();
    
    return allEmojis.filter(({ emoji, category }) => {
      // Search in keywords
      const keywords = getEmojiKeywords(emoji);
      if (keywords && keywords.includes(query)) {
        return true;
      }
      
      // Search in category name
      if (category.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in emoji character itself (for exact matches)
      if (emoji.includes(query)) {
        return true;
      }
      
      return false;
    });
  }, [searchQuery]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-80 h-96 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm dark:text-gray-100">Emoji</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X className="h-4 w-4 dark:text-gray-300" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
          />
        </div>
      </div>

      {/* Emoji List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredEmojis ? (
          // Show search results
          filteredEmojis.length > 0 ? (
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map(({ emoji, category }, index) => (
                <button
                  key={`search-${index}`}
                  onClick={() => {
                    onSelect(emoji);
                    setSearchQuery('');
                  }}
                  className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p className="text-sm">No emojis found</p>
            </div>
          )
        ) : (
          // Show categories
          Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <div key={category} className="mb-4">
              <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{category}</h4>
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji, index) => (
                  <button
                    key={`${category}-${index}`}
                    onClick={() => onSelect(emoji)}
                    className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;

