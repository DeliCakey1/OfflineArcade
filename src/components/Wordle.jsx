import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const WORDS_4 = [
  'ABLE','ARCH','ATOM','AXIS','BAIL','BAIT','BARN','BELL','BIRD','BONE',
  'BOOM','BORE','CAFE','CAGE','CAVE','CLAY','COOL','CURE','CURL','DAMP',
  'DARK','DART','DAWN','DEER','DEFT','DRIP','DUSK','EACH','ECHO','EDGE',
  'ENVY','EWER','FADE','FAST','FERN','FIRE','FISH','FIST','FIZZ','FLAX',
  'FLUX','FROG','GALE','GAME','GATE','GELD','GLOW','GOAT','GOLD','GUST',
  'HALT','HARM','HASP','HAZE','HILL','HOAX','HYPE','ICON','INCH','IRIS',
  'IRON','ITCH','JADE','JAIL','JAZZ','JIBE','JINX','JOLT','JUMP','KEEL',
  'KELF','KEMP','KING','KITE','KNAP','KNOT','LAKE','LAWN','LICK','LIMB',
  'LIME','LOFT','LOME','LOOM','MAZE','MELD','MELT','MIND','MIST','MOON',
  'MOOR','MOPS','MYTH','NAIL','NEST','NIBS','NICE','NICK','NIGH','NOOK',
  'OAFS','OINK','OOZE','OPEN','ORCA','PATH','PEAK','PEAR','PELT','PINE',
  'PLAY','POEM','POLE','PORK','QUIR','QUIZ','RAIN','RARE','REEF','RIFE',
  'RINS','RISE','ROCK','ROTE','RUBY','SAGE','SALT','SCUM','SEAL','SEEP',
  'SENT','SILK','SOAK','STAR','TALE','THAW','TILE','TOAD','TOIL','TRIM',
  'TUNA','TUSK','UGLY','UNDO','UNIT','URCH','URNS','USUR','VANE','VAST',
  'VEIL','VEIN','VIAL','VIBE','VINE','VOID','WAND','WARM','WELT','WHIP',
  'WISP','WOKE','WORD','WREN','YAWL','YEAR','YELL','YELP','YOGA','YORE',
  'ZANY','ZEST','ZINC','ZING','ZONE',
]

const WORDS_5 = [
  'GAMES','PIXEL','QUEST','LEVEL','SCORE','MUSIC','LIGHT','DANCE','FLAME','GHOST',
  'HONEY','JOLLY','LEMON','OCEAN','PIANO','QUEEN','RIVER','SNAKE','TIGER','ULTRA',
  'WAGON','YACHT','ZEBRA','CORAL','BRAVE','CLOUD','EARTH','APPLE','BEACH','CANDY',
  'DWARF','EAGLE','FAIRY','GLOBE','IGLOO','JUICE','KARMA','LUNAR','MAGIC','NERVE',
  'OLIVE','POUCH','QUAKE','RHINO','SAUNA','THORN','UMBRA','VAPOR','WATCH','XEROX',
  'YOUTH','ZONAL','BLAZE','CRANE','DRIFT','FROST','GLEAM','HAUNT','KNOCK','MANGO',
  'OXIDE','QUIRK','RIDGE','SCOUT','TOPAZ','UNITY','VIVID','WHIRL','ABODE','BROOD',
  'CHILL','DODGE','EMBER','FLOCK','GRAPE','HEDGE','IVORY','JOUST','KNEEL','LILAC',
  'MERIT','NIFTY','OPERA','PRISM','QUILL','ROBIN','SPEAR','TEASE','UNFIT','VOUCH',
  'WAIST','BRISK','CRISP','DRAIN','FEAST','GROIN','HUMID','INERT','KNOLL','LATCH',
  'MIRTH','NADIR','OPTIC','PLUME','REALM','SIREN','VIGOR','WRIST','ABIDE','BLISS',
  'CHASE','DWELL','FABLE','INLAY','NOBLE','OAKEN','TROUT','WAGER','ATLAS','CREEK',
  'DWELT','GOOSE','KNELT','LUNGE','MARSH','PROWL','QUART','RENCH','THYME','UNLIT',
  'AGENT','ALIEN','ALIVE','ALLEY','ALLOW','ALTER','AMAZE','AMBER','AMONG','ANGER',
  'ANGLE','ANGRY','APART','APPLY','ARENA','ARGUE','ARISE','ASSET','ATTIC','AUDIO',
  'AVAIL','AVOID','AWARE','BADLY','BAKER','BASIC','BASIS','BEGIN','BELOW','BENCH',
  'BERRY','BIRTH','BLACK','BLADE','BLAME','BLANK','BLAST','BLEED','BLEND','BLESS',
  'BLIND','BLOCK','BLOOD','BLOOM','BLOWN','BOARD','BONUS','BOOTH','BOUND','BRAIN',
  'BRAND','BREAD','BREAK','BREED','BRICK','BRIDE','BRIEF','BRING','BROAD','BROKE',
  'BROWN','BRUSH','BUILD','BUNCH','BURST','BUYER','CABLE','CAMEL','CARRY','CATCH',
  'CAUSE','CEASE','CHAIN','CHAIR','CHEAP','CHECK','CHEEK','CHEER','CHESS','CHEST',
  'CHIEF','CHILD','CHOIR','CHOSE','CIVIC','CIVIL','CLAIM','CLASH','CLASS','CLEAN',
  'CLEAR','CLERK','CLICK','CLIFF','CLIMB','CLING','CLOCK','CLONE','CLOSE','CLOTH',
  'COACH','COAST','COLOR','COMET','CORAL','COULD','COUNT','COURT','COVER','CRACK',
  'CRAFT','CRASH','CRAZY','CREAM','CREEP','CREST','CRIME','CROSS','CROWD','CROWN',
  'CRUDE','CRUEL','CRUSH','CURVE','CYCLE','DAILY','DEBUT','DECAY','DECOR','DELAY',
  'DELTA','DEMON','DENSE','DEPOT','DEPTH','DEVIL','DIARY','DIRTY','DOUBT','DOUGH',
  'DRAFT','DRAMA','DRANK','DRAWN','DREAM','DRESS','DRIED','DRILL','DRINK','DRIVE',
  'DRONE','DROVE','DRUNK','DYING','EAGER','EARLY','EIGHT','ELDER','ELECT','ELITE',
  'EMAIL','EMPTY','ENEMY','ENJOY','ENTER','ENTRY','EQUAL','ERROR','EVENT','EVERY',
  'EXACT','EXILE','EXIST','EXTRA','FACET','FAITH','FALSE','FANCY','FATAL','FAULT',
  'FEWER','FIBER','FIELD','FIFTY','FILTH','FINAL','FIRST','FIXED','FLASH','FLASK',
  'FLESH','FLICK','FLOAT','FLOOD','FLOOR','FLORA','FLOUR','FLOWN','FLUID','FLUSH',
  'FLUTE','FOCAL','FOCUS','FORCE','FORGE','FORTH','FORUM','FOUND','FRAME','FRANK',
  'FRAUD','FRONT','FROZE','FRUIT','FULLY','FUNNY','GAUGE','GIANT','GIVEN','GLARE',
  'GLASS','GLIDE','GLOOM','GLORY','GLOSS','GLOVE','GOING','GRACE','GRADE','GRAIN',
  'GRANT','GRAPH','GRASP','GRASS','GRAVE','GREAT','GREED','GREEN','GREET','GRIEF',
  'GRIND','GROAN','GROOM','GROSS','GROUP','GROVE','GROWL','GROWN','GUARD','GUESS',
  'GUEST','GUIDE','GUILD','GUILT','HAPPY','HARSH','HEART','HEAVY','HEIST','HELLO',
  'HENCE','HIRED','HOBBY','HOMER','HONOR','HORSE','HOTEL','HOURS','HOUSE','HUMAN',
  'HUMOR','HURRY','IDEAL','IMAGE','IMPLY','INBOX','INDEX','INFER','INNER','INPUT',
  'IRONY','JEWEL','JOINT','JUDGE','JUICY','JUMBO','KAYAK','KNOWN','LABEL','LABOR',
  'LANCE','LARGE','LASER','LATER','LAUGH','LAYER','LEADS','LEARN','LEASE','LEAST',
  'LEAVE','LEGAL','LEVEL','LEVER','LIMIT','LINER','LINKS','LIVER','LLAMA','LOBBY',
  'LOCAL','LODGE','LOGIC','LOOKS','LOOSE','LOTUS','LOVER','LOWER','LOYAL','LUCKY',
  'LUNCH','MAJOR','MAKER','MANOR','MAPLE','MARCH','MARRY','MATCH','MAYOR','MEDAL',
  'MEDIA','MERCY','MERGE','MERRY','METAL','METER','MIGHT','MINOR','MINUS','MIXED',
  'MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVIE','MUDDY',
  'NAIVE','NANNY','NASAL','NASTY','NAVEL','NEVER','NEWER','NEWLY','NIGHT','NOISE',
  'NORTH','NOTED','NOVEL','NURSE','ONSET','ORBIT','ORDER','OTHER','OUTER','PAINT',
  'PANEL','PANIC','PAPER','PARTY','PASTA','PATCH','PAUSE','PEACE','PEACH','PEARL',
  'PENNY','PHASE','PHONE','PHOTO','PIECE','PILOT','PINCH','PITCH','PLACE','PLAIN',
  'PLANE','PLANT','PLATE','PLEAD','PLUCK','PLUSH','POINT','POISE','POKER','POLAR',
  'PORCH','POUND','POWER','PRANK','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR',
  'PRIZE','PROBE','PROOF','PROSE','PROUD','PROVE','PRUNE','PULSE','PUNCH','PUPIL',
  'PURSE','QUALM','QUERY','QUEUE','QUICK','QUIET','QUILT','QUOTA','QUOTE','RADAR',
  'RADIO','RAISE','RALLY','RANCH','RANGE','RAPID','RATIO','RAVEN','REACH','REACT',
  'READY','REBEL','REFER','REIGN','RELAX','RELAY','REMIT','REPAY','REPLY','RIDER',
  'RIFLE','RIGHT','RIGID','RINSE','RISEN','RISKY','RIVAL','ROAST','ROBOT','ROCKY',
  'ROUGH','ROUND','ROUTE','ROYAL','RUGBY','RULER','RURAL','SADLY','SAINT','SALAD',
  'SALON','SALSA','SALTY','SANDY','SAUCE','SAUCY','SAVOR','SCALE','SCARE','SCENE',
  'SCENT','SCOOP','SCORN','SCRAP','SERVE','SEVEN','SEWER','SHADE','SHAFT','SHAKY',
  'SHALL','SHAME','SHAPE','SHARE','SHARK','SHARP','SHAVE','SHAWL','SHEEP','SHEER',
  'SHELF','SHELL','SHIRT','SHOCK','SHOOT','SHORE','SHORT','SHOUT','SHOVE','SHRUB',
  'SIEGE','SIGHT','SILLY','SINCE','SIXTH','SIXTY','SIZED','SKILL','SKULL','SLASH',
  'SLATE','SLAVE','SLEEP','SLEPT','SLICE','SLIDE','SLIME','SLOPE','SMART','SMELL',
  'SMILE','SMOKE','SNACK','SOLAR','SOLID','SOLVE','SOUND','SOUTH','SPARE','SPARK',
  'SPAWN','SPEAK','SPEED','SPELL','SPEND','SPENT','SPICE','SPIKE','SPINE','SPOKE',
  'SPOON','SPORT','SPRAY','SQUAD','STACK','STAFF','STAGE','STAIN','STAIR','STAKE',
  'STALE','STALK','STALL','STAMP','STAND','STARE','STARK','START','STATE','STAYS',
  'STEAK','STEAL','STEAM','STEEL','STEEP','STEER','STERN','STICK','STIFF','STILL',
  'STING','STOCK','STOLE','STONE','STOOD','STOOL','STOMP','STORE','STORM','STORY',
  'STOUT','STOVE','STRAP','STRAW','STRAY','STRIP','STUCK','STUDY','STUFF','STUMP',
  'STYLE','SUGAR','SUITE','SUPER','SURGE','SWARM','SWEAR','SWEAT','SWEEP','SWEET',
  'SWELL','SWEPT','SWIFT','SWING','SWIRL','SWORD','SWORE','SWORN','SWUNG','TABLE',
  'TASTE','TEACH','TEETH','TENSE','TENTH','THEME','THERE','THICK','THIEF','THING',
  'THINK','THIRD','THOSE','THREE','THREW','THROW','THUMB','TIDAL','TIGHT','TIMER',
  'TIRED','TITLE','TODAY','TOKEN','TOPIC','TOTAL','TOUCH','TOUGH','TOWER','TOXIC',
  'TRACE','TRACK','TRADE','TRAIL','TRAIN','TRAIT','TRASH','TREAT','TREND','TRIAL',
  'TRICK','TRIED','TROOP','TRUCK','TRULY','TRUNK','TRUST','TRUTH','TULIP','TWICE',
  'TWIST','UDDER','UNDER','UNION','UNTIL','UPPER','UPSET','URBAN','USAGE','USUAL',
  'UTTER','VAGUE','VALID','VALUE','VALVE','VAULT','VENUE','VERGE','VIOLA','VIPER',
  'VIRAL','VIRUS','VISIT','VISTA','VITAL','VIXEN','VOCAL','VODKA','VOICE','VOTER',
  'WASTE','WATER','WEIGH','WEIRD','WHEAT','WHEEL','WHERE','WHICH','WHILE',
  'WHINE','WHITE','WHOLE','WHOSE','WIDOW','WIDTH','WITCH','WOMAN','WOMEN','WORLD',
  'WORRY','WORSE','WORST','WORTH','WOULD','WOUND','WRATH','WRECK','WRITE','WRONG',
  'WROTE','YIELD','YOUNG',
]

const WORDS_6 = [
  'ARCADE','GAMING','PUZZLE','SILVER','GOLDEN','SHADOW','PHOTON','GALAXY','COSMIC',
  'FROZEN','LEGEND','MYSTIC','SPIRIT','CASTLE','DRAGON','FOREST','BRIDGE','GARDEN','ISLAND',
  'JUNGLE','LAUNCH','MARKET','PALACE','TEMPLE','VALLEY','ZENITH','AFFIRM','ALBEIT','ALMOST',
  'ALWAYS','AMOUNT','ANNUAL','ANSWER','APPEAR','AROUND','ARTIST','ASPECT','ASSERT','ASSUME',
  'ATTACK','ATTEND','BARELY','BASKET','BATTLE','BEAUTY','BECOME','BEFORE','BEHALF','BEHIND',
  'BELONG','BESIDE','BEYOND','BISHOP','BITTER','BOTTOM','BOUNCE','BRANCH','BREACH','BREATH',
  'BRIGHT','BROKEN','BRONZE','BRUTAL','BUBBLE','BUCKET','BUDGET','BULLET','BUNDLE','BURDEN',
  'BUREAU','BURIAL','BUTTER','BUTTON','CANCEL','CANYON','CARBON','CAREER','CARPET','CARROT',
  'CASUAL','CATTLE','CAUGHT','CEMENT','CENTER','CHANCE','CHANGE','CHARGE','CHEESE','CHERRY',
  'CHOICE','CHOOSE','CHURCH','CIRCLE','CLEVER','CLIENT','CLOSET','CLUTCH','COARSE','COFFEE',
  'COLUMN','COMBAT','COMEDY','COMMIT','COMMON','COMPEL','COOKIE','COPPER','CORNER','COTTON',
  'COUPLE','COURSE','COUSIN','CREATE','CREDIT','CRISIS','CUSTOM','DAMAGE','DANGER','DEALER',
  'DEBATE','DECADE','DECENT','DEFEAT','DEFEND','DEFINE','DEGREE','DEMAND','DEPEND','DESERT',
  'DESIGN','DESIRE','DETAIL','DETECT','DEVICE','DIFFER','DINNER','DIRECT','DIVINE','DOCTOR',
  'DOMAIN','DONKEY','DOUBLE','DRIVEN','DRIVER','DURING','EASILY','EDITOR','EFFECT','EFFORT',
  'EIGHTH','ELEVEN','EMERGE','EMPIRE','EMPLOY','ENABLE','ENERGY','ENGAGE','ENGINE','ENOUGH',
  'ENTIRE','ENTITY','EQUITY','ESCAPE','ESTATE','EVOLVE','EXCEED','EXCEPT','EXCESS','EXCUSE',
  'EXPAND','EXPECT','EXPERT','EXPORT','EXTEND','EXTENT','FABRIC','FAIRLY','FAMILY','FAMOUS',
  'FATHER','FELLOW','FIERCE','FIGURE','FILTER','FINGER','FINISH','FLOWER','FLYING','FOLLOW',
  'FORBID','FORMAL','FORMER','FOSSIL','FOSTER','FOURTH','FREELY','FREEZE','FRENCH','FUSION',
  'FUTURE','GATHER','GENDER','GENIUS','GENTLE','GINGER','GLOBAL','GOVERN','GRAVEL','GROUND',
  'GROWTH','GUILTY','GUITAR','HAMMER','HANDLE','HAPPEN','HARDLY','HAZARD','HEALTH','HEAVEN',
  'HEIGHT','HERBAL','HEROIC','HIDDEN','HOLLOW','HONEST','HORROR','HUNGER','HUNTER','HYBRID',
  'IGNORE','IMMUNE','IMPACT','IMPORT','IMPOSE','INCOME','INDEED','INFORM','INJURY','INLAND',
  'INSIST','INTACT','INTEND','INTENT','INVEST','ITSELF','JACKET','JERSEY','JOCKEY','JUNIOR',
  'KERNEL','KETTLE','KIDNEY','KNIGHT','LAWYER','LAYOUT','LEADER','LEAGUE','LENDER','LESSON',
  'LETTER','LIKELY','LINEAR','LINGER','LIQUID','LISTEN','LITTLE','LIVELY','LOCATE','LOVELY',
  'LUXURY','MAINLY','MANAGE','MANNER','MARBLE','MARGIN','MARINE','MASTER','MATTER','MEDIUM',
  'MELODY','MEMBER','MEMORY','MENTAL','MERELY','METHOD','MIDDLE','MIGHTY','MILLER','MINUTE',
  'MIRROR','MOBILE','MODERN','MODIFY','MOMENT','MOSTLY','MOTHER','MOTION','MOTIVE','MUTUAL',
  'MYSELF','NARROW','NATION','NATURE','NEARBY','NEARLY','NEEDLE','NICKEL','NORMAL','NOTICE',
  'NOTION','NUMBER','OBJECT','OBTAIN','OCCUPY','OFFEND','OFFICE','ONLINE','OPPOSE','OPTION',
  'ORANGE','ORIGIN','OUTFIT','OUTLAW','OUTPUT','PARENT','PATROL','PATRON','PEBBLE','PEOPLE',
  'PERIOD','PERMIT','PERSON','PHRASE','PICKLE','PILLAR','PILLOW','PLAGUE','PLANET','PLAYER',
  'PLEASE','PLEDGE','PLENTY','POCKET','POETRY','POISON','POLICE','POLICY','POLISH','POLITE',
  'POSTER','POTATO','POWDER','PRAYER','PREFER','PRETTY','PRINCE','PRISON','PROFIT','PROMPT',
  'PROPER','PROVEN','PUBLIC','PURSUE','RABBIT','RANDOM','RARELY','RATHER','REASON','RECALL',
  'RECORD','REDUCE','REFUSE','REGARD','REGIME','REGION','REJECT','RELATE','RELIEF','REMAIN',
  'REMEDY','REMOTE','REMOVE','RENDER','RENTAL','REPAIR','REPEAT','RESIST','RESORT',
  'RESULT','RETAIL','RETAIN','RETIRE','RETURN','REVEAL','REVIEW','REWARD','RHYTHM','ROCKET',
  'ROTATE','RULING','RUNNER','SACRED','SAFETY','SALARY','SAMPLE','SCARED','SCHOOL','SCREEN',
  'SCRIPT','SEARCH','SEASON','SECOND','SECRET','SECTOR','SECURE','SELECT','SENIOR','SERIES',
  'SETTLE','SEVERE','SHADOW','SHOWER','SIGNAL','SILENT','SILVER','SIMPLE','SIMPLY','SINGER',
  'SINGLE','SISTER','SMOOTH','SOLELY','SOLEMN','SORROW','SOURCE','SPEECH','SPIRIT','SPREAD',
  'SPRING','SQUARE','STABLE','STANCE','STAPLE','STATUS','STEADY','STEREO','STICKY','STITCH',
  'STRAIN','STRAND','STREAK','STREAM','STREET','STRESS','STRICT','STRIKE','STRING','STROKE',
  'STRONG','SUBMIT','SUDDEN','SUFFER','SUMMER','SUMMIT','SUPPLY','SURELY','SURVEY','SWITCH',
  'SYMBOL','SYSTEM','TACKLE','TALENT','TARGET','TEMPLE','TENANT','TENDER','TENNIS','TERROR',
  'THANKS','THEORY','THIRTY','THREAD','THRILL','THRONE','TIMBER','TISSUE','TOGGLE','TONGUE',
  'TOWARD','TRAVEL','TREATY','TRIBAL','TROPHY','TUNNEL','TWELVE','UNFAIR','UNIQUE','UNITED',
  'UNLESS','UNLIKE','UPDATE','UPHOLD','UPSIDE','URGENT','VALLEY','VENDOR','VESSEL','VIABLE',
  'VICTIM','VIRTUE','VISION','VISUAL','VOLUME','WALKER','WALLET','WANDER','WARMTH','WEALTH',
  'WEAPON','WEEKLY','WEIGHT','WICKED','WIDELY','WINDOW','WINNER','WINTER','WISDOM','WONDER',
  'WORKER','WORTHY','ZENITH','ZODIAC',
]

const WORDS_7 = [
  'VICTORY','QUANTUM','DIGITAL','EXTREME','FREEDOM','HORIZON','IMAGINE','INSIGHT','JOURNEY','KINGDOM',
  'MACHINE','NETWORK','PASSION','PURPOSE','QUALITY','REALITY','SHELTER','THROUGH','TOURIST','TROUBLE',
  'VILLAGE','WARRIOR','WEATHER','AMAZING','BALANCE','CHAPTER','COMFORT','CONDUCT','CONFIRM','CONTAIN',
  'COUNCIL','COUNTRY','CRYSTAL','CULTURE','CURRENT','DECLINE','DELIVER','DENSITY','DEPOSIT','DESERVE',
  'DESTINY','DESTROY','DEVELOP','DEVOTED','DISEASE','DISMISS','DISPLAY','DISPUTE','DISTANT','DIVERSE',
  'DRAWING','DYNAMIC','EARNING','ECONOMY','EDUCATE','ELEMENT','EMBRACE','EMOTION','EMPEROR','ENDLESS',
  'ENFORCE','ENHANCE','EPISODE','ESSENCE','EVIDENT','EXAMINE','EXAMPLE','EXCITED','EXECUTE','EXHIBIT',
  'EXPENSE','EXPLAIN','EXPLOIT','EXPLORE','EXPRESS','FANTASY','FASHION','FICTION','FIGHTER','FINALLY',
  'FINDING','FORMULA','FORTUNE','FORWARD','FOUNDER','FREIGHT','GALLERY','GATEWAY','GENERAL','GENETIC',
  'GENUINE','GLACIER','GRAMMAR','GRAVITY','GREATLY','HABITAT','HALFWAY','HANDFUL','HAPPILY','HARMONY',
  'HARVEST','HEADING','HEALTHY','HELPFUL','HERSELF','HIGHWAY','HIMSELF','HISTORY','HOLIDAY','HOSTILE',
  'HOUSING','HUNDRED','ILLEGAL','IMAGINE','IMMENSE','IMPRESS','IMPROVE','INCLUDE','INSPECT','INSTALL',
  'INSTANT','INTEGER','INTERIM','INVOLVE','ISOLATE','JUSTIFY','KITCHEN','LASTING','LEADING','LEATHER',
  'LEISURE','LIMITED','LITERAL','LOCALLY','LOGICAL','LOYALTY','MANKIND','MANSION','MASSIVE','MEANING',
  'MEASURE','MEDICAL','MEETING','MENTION','MESSAGE','MINERAL','MINIMUM','MIRACLE','MISSION','MIXTURE',
  'MONITOR','MORNING','MOUNTED','MYSTERY','NATURAL','NEITHER','NOTABLE','NOTHING','NUCLEAR','NURTURE',
  'OBVIOUS','OFFENSE','OFFICER','OPINION','ORGANIC','OUTLINE','OUTLOOK','OUTSIDE','OVERALL','PACKAGE',
  'PAINFUL','PAINTER','PARKING','PARTIAL','PARTNER','PASSAGE','PASSION','PATIENT','PATTERN','PAYMENT',
  'PENALTY','PENDING','PENSION','PERCENT','PERFECT','PERHAPS','PERSIST','PIONEER','PLASTIC','PLAYFUL',
  'PLEASED','POINTED','POPULAR','PORTION','POTTERY','POVERTY','POWERED','PREMIUM','PREPARE','PRESENT',
  'PREVIEW','PRIMARY','PRIVACY','PRIVATE','PROBLEM','PROCEED','PROCESS','PRODUCE','PRODUCT','PROFILE',
  'PROGRAM','PROJECT','PROMISE','PROMOTE','PROPOSE','PROTECT','PROTEIN','PROTEST','PROVIDE','PUBLISH',
  'QUALIFY','QUARTER','QUIETLY','RADICAL','REALIZE','RECEIPT','RECEIVE','RECOVER','REFLECT','REGULAR',
  'RELATED','RELEASE','REMAINS','REMOVAL','REPLACE','REQUEST','REQUIRE','RESERVE','RESOLVE','RESPECT',
  'RESPOND','RESTORE','RETIRED','RETREAT','REVENUE','REVERSE','ROUTINE','SCHOLAR','SCIENCE','SECTION',
  'SEGMENT','SERIOUS','SERVICE','SERVING','SESSION','SETTLER','SILENCE','SIMILAR','SITTING','SOCIETY',
  'SOLDIER','SOMEHOW','SPEAKER','SPECIAL','SPECIES','SPONSOR','SQUEEZE','STADIUM','STARTED','STATION',
  'STORAGE','STRANGE','SUBJECT','SUCCESS','SUGGEST','SUMMARY','SUPPORT','SURFACE','SURGEON','SURPLUS',
  'SURVIVE','SUSPECT','SUSTAIN','TEACHER','THEATRE','THERAPY','THOUGHT','TONIGHT','TOTALLY','TOURIST',
  'TOWARDS','TRACKER','TRADING','TURNING','TYPICAL','UNIFORM','UNKNOWN','UNUSUAL','UPDATED','UPGRADE',
  'UPRIGHT','UTILITY','VARIETY','VEHICLE','VENTURE','VERSION','VETERAN','VIOLENT','VIRTUAL','VISIBLE',
  'VISITOR','VOLTAGE','VOLCANO','WARNING','WEALTHY','WEBSITE','WEDDING','WEEKEND','WELCOME','WELFARE',
  'WESTERN','WHISPER','WHOEVER','WILLING','WITHOUT','WITNESS','WRITING','WRITTEN','YOUNGER','ABILITY',
  'ABOLISH','ACADEMY','ACHIEVE','ACQUIRE','ADDRESS','ADVANCE','ALGEBRA','ALREADY','AMATEUR',
  'AMBIENT','AMPLIFY','ANALYST','ANCIENT','ANXIETY','ANYBODY','APPLIED','ARRANGE','ARTICLE','ATTEMPT',
  'AUCTION','AVERAGE','BANKING','BARRIER','BATTERY','BEARING','BECAUSE','BEDROOM','BELIEVE','BENEATH',
  'BENEFIT','BESIDES','BETWEEN','BILLION','BLANKET','BONFIRE','BREATHE','BROTHER','CABINET','CALIBER',
  'CALLING','CAPABLE','CAPTAIN','CAPTURE','CAREFUL','CAUTION','CEILING','CENTRAL','CERAMIC','CERTAIN',
  'CHAMBER','CHANNEL','CHARITY','CHARTER','CHICKEN','CHRONIC','CIRCUIT','CITIZEN','CLASSIC','CLUSTER',
  'COASTAL','COATING','COLLECT','COLLEGE','COMBINE','COMFORT','COMMAND','COMMENT','COMPACT','COMPANY',
  'COMPARE','COMPETE','COMPLEX','CONCEPT','CONCERN','CONDUCT','CONFIRM','CONFUSE','CONNECT','CONSENT',
  'CONSIST','CONTACT','CONTAIN','CONTENT','CONTEXT','CONTROL','CONVERT','CORRECT','COUNCIL','COUNTER',
  'COURAGE','DEFAULT','DEFENCE','DISEASE','DISPLAY','DISTANT','DIVERSE','DONATED','DRAWING','DYNAMIC',
  'EARNING','ECONOMY','EDUCATE','ELEMENT','EMBRACE','EMOTION','EMPEROR','ENDLESS','ENFORCE','ENHANCE',
  'EPISODE','ESSENCE','EVIDENT','EXAMINE','EXAMPLE','EXECUTE','EXHIBIT','EXPENSE','EXPLAIN','EXPLOIT',
  'EXPLORE','EXPRESS','FANTASY','FASHION','FICTION','FIGHTER','FINALLY','FINDING','FORMULA','FORTUNE',
  'FORWARD','FOUNDER','FREIGHT','GALLERY','GATEWAY','GENERAL','GENETIC','GENUINE','GLACIER','GRAMMAR',
  'GRAVITY','GREATLY','HABITAT','HALFWAY','HANDFUL','HAPPILY','HARMONY','HARVEST','HEADING','HEALTHY',
  'HELPFUL','HERSELF','HIGHWAY','HIMSELF','HISTORY','HOLIDAY','HOSTILE','HOUSING','HUNDRED','ILLEGAL',
  'IMAGINE','IMMENSE','IMPRESS','IMPROVE','INCLUDE','INSPECT','INSTALL','INSTANT','INTEGER','INTERIM',
  'INVOLVE','ISOLATE','JUSTIFY','KITCHEN','LASTING','LEADING','LEATHER','LEISURE','LIMITED','LITERAL',
  'LOCALLY','LOGICAL','LOYALTY','MANKIND','MANSION','MASSIVE','MEANING','MEASURE','MEDICAL','MEETING',
  'MENTION','MESSAGE','MINERAL','MINIMUM','MIRACLE','MISSION','MIXTURE','MONITOR','MORNING','MOUNTED',
  'MYSTERY','NATURAL','NEITHER','NOTABLE','NOTHING','NUCLEAR','NURTURE','OBVIOUS','OFFENSE','OFFICER',
  'OPINION','ORGANIC','OUTLINE','OUTLOOK','OUTSIDE','OVERALL','PACKAGE','PAINFUL','PAINTER','PARKING',
  'PARTIAL','PARTNER','PASSAGE','PASSION','PATIENT','PATTERN','PAYMENT','PENALTY','PENDING','PENSION',
  'PERCENT','PERFECT','PERHAPS','PERSIST','PIONEER','PLASTIC','PLAYFUL','PLEASED','POINTED','POPULAR',
  'PORTION','POTTERY','POVERTY','POWERED','PREMIUM','PREPARE','PRESENT','PREVIEW','PRIMARY','PRIVACY',
  'PRIVATE','PROBLEM','PROCEED','PROCESS','PRODUCE','PRODUCT','PROFILE','PROGRAM','PROJECT','PROMISE',
  'PROMOTE','PROPOSE','PROTECT','PROTEIN','PROTEST','PROVIDE','PUBLISH','QUALIFY','QUARTER','QUIETLY',
  'RADICAL','REALIZE','RECEIPT','RECEIVE','RECOVER','REFLECT','REGULAR','RELATED','RELEASE','REMAINS',
  'REMOVAL','REPLACE','REQUEST','REQUIRE','RESERVE','RESOLVE','RESPECT','RESPOND','RESTORE','RETIRED',
  'RETREAT','REVENUE','REVERSE','ROUTINE','SCHOLAR','SCIENCE','SECTION','SEGMENT','SERIOUS','SERVICE',
  'SESSION','SETTLER','SILENCE','SIMILAR','SITTING','SOCIETY','SOLDIER','SOMEHOW','SPEAKER','SPECIAL',
  'SPECIES','SPONSOR','STADIUM','STARTED','STATION','STORAGE','STRANGE','SUBJECT','SUCCESS','SUGGEST',
  'SUMMARY','SUPPORT','SURFACE','SURGEON','SURPLUS','SURVIVE','SUSPECT','SUSTAIN','TEACHER','THEATRE',
  'THERAPY','THOUGHT','TONIGHT','TOTALLY','TOURIST','TOWARDS','TRACKER','TRADING','TURNING','TYPICAL',
  'UNIFORM','UNKNOWN','UNUSUAL','UPDATED','UPGRADE','UPRIGHT','UTILITY','VARIETY','VEHICLE','VENTURE',
  'VERSION','VETERAN','VIOLENT','VIRTUAL','VISIBLE','VISITOR','VOLTAGE','VOLCANO','WARNING','WEALTHY',
  'WEBSITE','WEDDING','WEEKEND','WELCOME','WELFARE','WESTERN','WHISPER','WHOEVER','WILLING','WITHOUT',
  'WITNESS','WRITING','WRITTEN','YOUNGER',
]

function dedup(arr) { return [...new Set(arr)].filter(w => w.length > 0) }

const WORDS = {
  Easy: dedup(WORDS_4),
  Normal: dedup(WORDS_5),
  Hard: dedup(WORDS_6),
  Insane: dedup(WORDS_7),
}

const MODES = [
  { name: 'Easy', emoji: [0x1f7e2], color: 'var(--neon-green)', wordLen: 4, guesses: 8 },
  { name: 'Normal', emoji: [0x1f7e1], color: 'var(--neon-yellow)', wordLen: 5, guesses: 6 },
  { name: 'Hard', emoji: [0x1f3e0], color: 'var(--neon-cyan)', wordLen: 6, guesses: 6 },
  { name: 'Insane', emoji: [0x1f480], color: 'var(--neon-red)', wordLen: 7, guesses: 5 },
]

const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','BACKSPACE'],
]

function evalGuess(guess, answer) {
  const result = Array(guess.length).fill('absent')
  const answerArr = answer.split('')
  const guessArr = guess.split('')
  const matched = Array(answer.length).fill(false)
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = 'correct'
      matched[i] = true
    }
  }
  for (let i = 0; i < guessArr.length; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < answerArr.length; j++) {
      if (!matched[j] && guessArr[i] === answerArr[j]) {
        result[i] = 'present'
        matched[j] = true
        break
      }
    }
  }
  return result
}




const COLOR_MAP = {
  correct: 'var(--neon-green)',
  present: 'var(--neon-yellow)',
  absent: '#555',
}

const PRIORITY = { correct: 3, present: 2, absent: 1 }

export default function Wordle({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [answer, setAnswer] = useState('')
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [flipIndices, setFlipIndices] = useState([])
  const [flippingRow, setFlippingRow] = useState(-1)
  const [shakeRow, setShakeRow] = useState(-1)
  const [popTiles, setPopTiles] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [invalidWord, setInvalidWord] = useState(false)
  const [keyColors, setKeyColors] = useState({})
  const [copied, setCopied] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('wordle')
  const isPlaying = mode && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  function pickWord(wordLen) {
    const pool = WORDS[MODES.find(m => m.wordLen === wordLen)?.name || 'Normal']
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function startGame(modeObj) {
    const w = pickWord(modeObj.wordLen)
    setMode(modeObj)
    setAnswer(w)
    setGuesses([])
    setCurrentGuess('')
    setFlipIndices([])
    setFlippingRow(-1)
    setShakeRow(-1)
    setPopTiles([])
    setGameOver(false)
    setWon(false)
    setInvalidWord(false)
    setKeyColors({})
    setCopied(false)
  }

  const updateKeyColors = useCallback((guess, evalResult) => {
    setKeyColors(prev => {
      const next = { ...prev }
      for (let i = 0; i < guess.length; i++) {
        const ch = guess[i]
        const cur = evalResult[i]
        const prevP = PRIORITY[next[ch]] || 0
        const newP = PRIORITY[cur] || 0
        if (newP > prevP) next[ch] = cur
      }
      return next
    })
  }, [])

  function submitGuess() {
    if (!mode) return
    const g = currentGuess.toUpperCase()
    if (g.length !== mode.wordLen) return

    const pool = WORDS[mode.name]
    if (!pool.includes(g) && g !== answer) {
      setInvalidWord(true)
      setShakeRow(guesses.length)
      sound('lose')
      setTimeout(() => { setInvalidWord(false); setShakeRow(-1) }, 500)
      return
    }

    sound('click')
    const ev = evalGuess(g, answer)

    setFlippingRow(guesses.length)
    setFlipIndices(Array.from({ length: mode.wordLen }, (_, i) => i))
    setPopTiles([])

    for (let i = 0; i < ev.length; i++) {
      const idx = i
      setTimeout(() => { sound('score') }, idx * 300 + 150)
    }

    setTimeout(() => {
      setGuesses(prev => [...prev, { word: g, eval: ev }])
      setFlippingRow(-1)
      setFlipIndices([])
      updateKeyColors(g, ev)

      const isWin = g === answer
      const totalGuesses = guesses.length + 1

      if (isWin) {
        setGameOver(true)
        setWon(true)
        setPopTiles(Array.from({ length: mode.wordLen }, (_, i) => i))
        sound('win')
        recordGame(true, totalGuesses)
      } else if (totalGuesses >= mode.guesses) {
        setGameOver(true)
        setWon(false)
        sound('lose')
        recordGame(false, 0)
      }

      setCurrentGuess('')
    }, mode.wordLen * 300 + 200)
  }

  function handleKey(key) {
    if (gameOver || flippingRow >= 0) return
    sound('click')

    if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1))
    } else if (key === 'ENTER') {
      submitGuess()
    } else if (key.length === 1 && /^[A-Z]$/.test(key)) {
      if (currentGuess.length < mode.wordLen) {
        setCurrentGuess(prev => prev + key)
        setPopTiles([currentGuess.length])
        setTimeout(() => setPopTiles([]), 100)
      }
    }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (!mode || gameOver) return
      if (e.key === 'Enter') { handleKey('ENTER'); return }
      if (e.key === 'Backspace') { handleKey('BACKSPACE'); return }
      const k = e.key.toUpperCase()
      if (/^[A-Z]$/.test(k)) handleKey(k)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, gameOver, currentGuess, guesses, answer])

  function shareResult() {
    const lines = [
      'Wordle (' + (mode?.name) + ')',
      (won ? guesses.length : 'X') + '/' + mode?.guesses,
      ...guesses.map(g => g.eval.map(e => e === 'correct' ? 'G' : e === 'present' ? 'Y' : '-').join('')),
      '',
      'Offline Arcade',
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!mode) {
    return (
      <div className="game-card slide-in">
        <h2>Wordle</h2>
        <p className="description">Guess the word in limited tries!</p>
        <div className="gtn-mode-grid">
          {MODES.map(m => (
            <button key={m.name} className="gtn-mode-card" style={{ '--mode-color': m.color }}
              onClick={() => { sound('click'); startGame(m) }}>
              <div className="gtn-mode-emoji">{m.emoji}</div>
              <div className="gtn-mode-name">{m.name}</div>
              <div className="gtn-mode-attempts">{m.wordLen} letters &middot; {m.guesses} guesses</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Wordle</h2>
      <p className="description">{mode.name} &mdash; {mode.wordLen} letters, {mode.guesses} guesses</p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Guess</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--neon-cyan)' }}>{guesses.length}/{mode.guesses}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Streak</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--neon-green)' }}>{won ? guesses.length : '--'}</div>
        </div>
      </div>

      {gameOver && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 8, animation: 'bounceIn 0.6s ease' }}>
            {won ? '!' : 'X'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: won ? 'var(--neon-green)' : 'var(--neon-red)', marginBottom: 4 }}>
            {won ? 'You got it!' : 'Game Over!'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 8 }}>
            {won ? 'Solved in ' + guesses.length + (guesses.length === 1 ? ' try' : ' tries') : 'The word was: ' + answer}
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateRows: 'repeat(' + mode.guesses + ', 1fr)',
        gap: 6,
        maxWidth: 340,
        margin: '0 auto 16px',
      }}>
        {Array.from({ length: mode.guesses }).map((_, rowIdx) => {
          const g = guesses[rowIdx]
          const isCurrentRow = rowIdx === guesses.length && !gameOver
          const display = g ? g.word : (isCurrentRow ? currentGuess : '')
          const evalArr = g ? g.eval : null
          const isFlipping = flippingRow === rowIdx
          const isShaking = shakeRow === rowIdx

          return (
            <div key={rowIdx} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(' + mode.wordLen + ', 1fr)',
              gap: 6,
              animation: isShaking ? 'shakeRow 0.4s ease' : undefined,
            }}>
              {Array.from({ length: mode.wordLen }).map((_, colIdx) => {
                const ch = display[colIdx] || ''
                const ev = evalArr ? evalArr[colIdx] : null
                const isFlippingCol = isFlipping && flipIndices.includes(colIdx)
                const shouldPop = popTiles.includes(colIdx) && isCurrentRow

                return (
                  <div key={colIdx} style={{
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    borderRadius: 6,
                    border: ch ? '2px solid ' + (ev ? COLOR_MAP[ev] : 'var(--neon-cyan)') : '2px solid var(--text-dim)',
                    background: ev ? COLOR_MAP[ev] : 'var(--bg-card)',
                    color: ev ? '#fff' : (ch ? 'var(--text-dim)' : 'transparent'),
                    animation: isFlippingCol
                      ? 'tileFlip 0.3s ease ' + (colIdx * 0.1) + 's'
                      : shouldPop
                      ? 'popIn 0.15s ease'
                      : undefined,
                    transformStyle: 'preserve-3d',
                    textTransform: 'uppercase',
                    boxShadow: ev ? '0 0 8px ' + COLOR_MAP[ev] + '40' : 'none',
                  }}>
                    {ch}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {invalidWord && (
        <div style={{ textAlign: 'center', color: 'var(--neon-red)', fontSize: 13, fontWeight: 600, marginBottom: 8, animation: 'shakeRow 0.3s ease' }}>
          Not in word list
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        {KB_ROWS.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {row.map(key => {
              const isWide = key === 'ENTER' || key === 'BACKSPACE'
              const kColor = keyColors[key]
              const bg = kColor ? COLOR_MAP[kColor] : '#333'
              const label = key === 'BACKSPACE' ? '\u232B' : key

              return (
                <button key={key} onClick={() => handleKey(key)} style={{
                  minWidth: isWide ? 56 : 36,
                  height: 44,
                  fontSize: isWide ? 12 : 16,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  border: 'none',
                  borderRadius: 6,
                  background: bg,
                  color: '#fff',
                  cursor: gameOver || flippingRow >= 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: gameOver || flippingRow >= 0 ? 0.5 : 1,
                  transition: 'background 0.15s, transform 0.1s',
                  textTransform: 'uppercase',
                  boxShadow: kColor ? '0 0 6px ' + COLOR_MAP[kColor] + '40' : 'none',
                }}>
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {gameOver && (
          <>
            <button className="play-again-btn" onClick={() => { sound('click'); startGame(mode) }}>
              Play Again
            </button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-cyan))' }}
              onClick={() => { sound('click'); setMode(null) }}>
              New Game
            </button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? 'Copied!' : 'Copy Result'}
            </button>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={() => { setMode(null); onPlayingChange?.(false) }} gameOver={gameOver} className="quit-btn" />
      </div>
    </div>
  )
}
