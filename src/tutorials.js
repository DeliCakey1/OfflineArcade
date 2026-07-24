const TUTORIALS = {
  rps: {
    title: 'Rock Paper Scissors',
    rules: ['Choose Rock, Paper, or Scissors', 'Rock beats Scissors, Scissors beats Paper, Paper beats Rock', 'Beat the bot to win XP and coins!'],
    tips: ['Watch for patterns in the bot\'s choices', 'Try mixing up your picks unpredictably'],
  },
  ssg: {
    title: 'Split Steal Give Away',
    rules: ['Choose to Split, Steal, or Give Away', 'If both Split, you each get half the prize', 'If one Steals, they take everything'],
    tips: ['Splitting is safer for steady gains', 'Steal occasionally to keep the bot guessing'],
  },
  gtn: {
    title: 'Guess The Number',
    rules: ['The bot picks a secret number', 'Make guesses to narrow it down', 'Fewer guesses = more XP'],
    tips: ['Use binary search — start at the middle', 'Halve your range with each guess'],
  },
  'gtn-hc': {
    title: 'Hot or Cold',
    rules: ['Guess numbers to find the secret', 'You get Hot/Cold clues', 'Closer = Hotter, farther = Colder'],
    tips: ['Large jumps first, then refine', 'Use clues to narrow down the range'],
  },
  hol: {
    title: 'Higher or Lower',
    rules: ['A card is shown, guess if next is higher or lower', 'Ace is lowest, King is highest', 'Build a streak for bonus XP'],
    tips: ['Remember which cards have been shown', '7s are tricky — guess conservatively'],
  },
  dice: {
    title: 'Dice Roll',
    rules: ['Place your bet: Exact, Range, or Parity', 'Exact pays the most but is hardest', 'Range and Parity are safer bets'],
    tips: ['Parity (Even/Odd) has ~50% odds', 'Range bets balance risk and reward'],
  },
  coin: {
    title: 'Coin Flip Streak',
    rules: ['Call Heads or Tails each flip', 'Build a streak for bigger rewards', 'One wrong call resets your streak'],
    tips: ['Streaks compound — longer = more XP', 'There\'s no pattern, but conviction pays off'],
  },
  memory: {
    title: 'Memory Match',
    rules: ['Flip two cards to find matching pairs', 'Remember where cards are', 'Find all pairs in fewest moves'],
    tips: ['Start with corners and edges', 'Build a mental map of the grid'],
  },
  word: {
    title: 'Word Scramble',
    rules: ['Unscramble the letters to find the word', 'You get hints for wrong guesses', 'Fewer wrong guesses = more XP'],
    tips: ['Look for common letter pairs (TH, SH, CH)', 'Try suffixes first (-ING, -ED, -TION)'],
  },
  merge: {
    title: 'Number Merge',
    rules: ['Swipe to slide tiles in a direction', 'Matching numbers merge and double', 'Reach the goal number to win'],
    tips: ['Keep your highest tile in a corner', 'Build a chain along one edge'],
  },
  reaction: {
    title: 'Reaction Time',
    rules: ['Wait for the screen to turn green', 'Click as fast as you can!', 'Your time in milliseconds is your score'],
    tips: ['Stay focused — don\'t click early!', 'Faster = lower ms = better score'],
  },
  typing: {
    title: 'Typing Speed',
    rules: ['Type each word as fast as you can', 'Your WPM is measured', 'Accuracy matters too!'],
    tips: ['Keep your eyes on the next word', 'Home row position helps accuracy'],
  },
  simon: {
    title: 'Simon Says',
    rules: ['Watch the color sequence carefully', 'Repeat the sequence by clicking colors', 'Each round adds one more step'],
    tips: ['Focus on the pattern, not individual colors', 'Try to group colors in your memory'],
  },
  slots: {
    title: 'Slots',
    rules: ['Spin the reels and match symbols', 'Different symbols have different payouts', 'Three of a kind pays the most'],
    tips: ['Higher bets = higher potential payouts', 'Cherries are most common, diamonds rarest'],
  },
  blackjack: {
    title: 'Blackjack',
    rules: ['Get as close to 21 as possible without going over', 'Face cards are worth 10, Aces are 1 or 11', 'Beat the dealer to win'],
    tips: ['Always stand on 17 or higher', 'Hit on 11 or less — you can\'t bust'],
  },
  whack: {
    title: 'Whack-a-Mole',
    rules: ['Moles pop up from holes', 'Click them before they hide', 'Don\'t click the empty holes!'],
    tips: ['Watch for the pattern of popping', 'Speed increases as you score higher'],
  },
  snake: {
    title: 'Snake',
    rules: ['Guide the snake to eat food', 'Each food makes you grow longer', 'Don\'t hit walls or yourself!'],
    tips: ['Circle the edges for safety', 'Don\'t trap yourself in tight spaces'],
  },
  tetris: {
    title: 'Tetris',
    rules: ['Fit falling blocks into complete rows', 'Complete rows to clear them', 'Game ends when blocks stack to the top'],
    tips: ['Keep a flat surface for easy placement', 'Save the I-piece for clearing 4 rows'],
  },
  breakout: {
    title: 'Breakout',
    rules: ['Bounce the ball to break all bricks', 'Move the paddle to keep the ball alive', 'Don\'t let the ball fall below'],
    tips: ['Aim for corners to break hard-to-reach bricks', 'Use spin to control ball direction'],
  },
  flappy: {
    title: 'Flappy Bird',
    rules: ['Click/tap to flap and rise', 'Navigate through the gaps', 'One hit ends the game'],
    tips: ['Focus on the gap, not the pipes', 'Small taps give better control'],
  },
  minesweeper: {
    title: 'Minesweeper',
    rules: ['Click cells to reveal them', 'Numbers show adjacent mine count', 'Flag cells you think are mines', 'Reveal all safe cells to win'],
    tips: ['Start from corners — they have fewer neighbors', 'Use numbers to logically deduce mine locations'],
  },
  lightsout: {
    title: 'Lights Out',
    rules: ['Click a light to toggle it and its neighbors', 'All lights start on', 'Turn all lights off to win'],
    tips: ['Work from top-left to bottom-right', 'Some positions have fixed solutions'],
  },
  mastermind: {
    title: 'Mastermind',
    rules: ['Guess the secret code of 4 colors', 'White peg = right color, wrong position', 'Red peg = right color and position', 'Crack the code in 10 attempts'],
    tips: ['Use all different colors first to gather info', 'Narrow down positions after finding colors'],
  },
  dodge: {
    title: 'Dodge',
    rules: ['Move to avoid incoming obstacles', 'Survive as long as you can', 'Score increases with time survived'],
    tips: ['Stay near the center for more options', 'Watch for patterns in obstacle spawns'],
  },
  mergeblitz: {
    title: 'Merge Blitz',
    rules: ['Timed 2048-style merging', 'Swipe to merge matching numbers', 'Build combos for multiplier bonuses', 'Get the highest score before time runs out'],
    tips: ['Chain merges quickly for combo multipliers', 'Keep your highest tile in a corner'],
  },
  connect4: {
    title: 'Connect Four',
    rules: ['Drop pieces to connect four in a row', 'First to connect 4 horizontally, vertically, or diagonally wins', 'Play against the AI'],
    tips: ['Control the center column', 'Set up dual threats the AI can\'t block'],
  },
  sudoku: {
    title: 'Sudoku',
    rules: ['Fill each row, column, and 3×3 box with 1-9', 'No repeats in any row, column, or box', 'Use logic — no guessing needed'],
    tips: ['Start with cells that have few options', 'Look for "naked singles" — cells with only one possibility'],
  },
  mathdash: {
    title: 'Math Dash',
    rules: ['Solve arithmetic problems as fast as you can', 'Build combos for bonus points', 'The faster you answer, the higher your score'],
    tips: ['Scan for easy problems first', 'Don\'t waste time on hard ones — skip if needed'],
  },
  wordle: {
    title: 'Wordle',
    rules: ['Guess a 5-letter word in 6 tries', 'Green = correct letter in correct spot', 'Yellow = correct letter in wrong spot', 'Gray = letter not in the word'],
    tips: ['Start with vowels (AEIOU)', 'Use common consonants (STLNR) in your second guess'],
  },
}

export default TUTORIALS
