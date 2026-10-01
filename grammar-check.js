/* Vazhedan grammar checker: finds common A1–C2 mistakes in English sentences, offline and with no AI.
   Hand-written patterns over words; each hit gives a fix, a rule id and the lesson that teaches it
   (the app shows the Persian explanation). Big word lists (verbs, nouns, adjectives) come from
   app/grammar.json, built from the lexicon by grammar/build.mjs.
   The app uses window.VZ_GRAMMAR; grammar/build.mjs requires this file to test the rules. */
(function (root) {
"use strict";

function set(s) { var o = Object.create(null); s.split(/\s+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }
function map(s) { var o = Object.create(null); s.split(/\s+/).forEach(function (p) { if (p) { var a = p.split(":"); o[a[0]] = a[1].replace(/_/g, " "); } }); return o; }

/* ---------- word knowledge ---------- */
var IRR = Object.create(null); // base -> [past, past participle]
("arise arose arisen|awake awoke awoken|bear bore born|beat beat beaten|become became become|begin began begun|bend bent bent|" +
 "bet bet bet|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown|break broke broken|breed bred bred|bring brought brought|" +
 "build built built|buy bought bought|catch caught caught|choose chose chosen|come came come|cost cost cost|creep crept crept|" +
 "cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|drink drank drunk|drive drove driven|eat ate eaten|" +
 "fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found|flee fled fled|fly flew flown|forbid forbade forbidden|" +
 "forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|get got got|give gave given|go went gone|grind ground ground|" +
 "grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|" +
 "know knew known|lay laid laid|lead led led|leave left left|lend lent lent|let let let|lie lay lain|lose lost lost|make made made|" +
 "mean meant meant|meet met met|pay paid paid|put put put|quit quit quit|read read read|ride rode ridden|ring rang rung|rise rose risen|" +
 "run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|shake shook shaken|" +
 "shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|" +
 "slide slid slid|speak spoke spoken|spend spent spent|spin spun spun|split split split|spread spread spread|spring sprang sprung|" +
 "stand stood stood|steal stole stolen|stick stuck stuck|sting stung stung|stink stank stunk|strike struck struck|swear swore sworn|" +
 "sweep swept swept|swim swam swum|swing swung swung|take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|" +
 "throw threw thrown|understand understood understood|wake woke woken|wear wore worn|weep wept wept|win won won|wind wound wound|" +
 "write wrote written|withdraw withdrew withdrawn|upset upset upset|overcome overcame overcome|mistake mistook mistaken|" +
 "misunderstand misunderstood misunderstood|forecast forecast forecast|broadcast broadcast broadcast|shine shone shone|" +
 "burst burst burst|cast cast cast|shed shed shed|thrust thrust thrust")
  .split("|").forEach(function (r) { var p = r.split(" "); IRR[p[0]] = [p[1], p[2]]; });
// other correct past forms (British or older ones), so they are never "fixed"
var ALT_PAST = map("learnt:learn burnt:burn dreamt:dream spelt:spell smelt:smell spilt:spill leant:lean leapt:leap knelt:kneel lit:light " +
  "gotten:get proven:prove dove:dive shined:shine hanged:hang waked:wake");
// real words that look like a wrong past (seed, lied, winded ...): never flagged as over-regular
var PP_OK = set("showed proved mowed sewed swelled");
var REAL_ED = set("seed lied hanged lighted learned dreamed burned shined proved spelled smelled spilled leaned leaped kneeled putted " +
  "costed quitted betted leaded sited ringed singed winded wined speeded flied dived teared waked bended fined wounded founded bored");
var MODAL = set("can could will would shall should must may might can't cannot couldn't won't wouldn't shouldn't mustn't mightn't shan't");
var BE = set("be am is are was were been being");
var DO_NEG = set("don't doesn't didn't");
var HAVE = set("have has had 've haven't hasn't hadn't");
var AUXQ = set("am is are was were do does did can could will would shall should must may might have has had don't doesn't didn't " +
  "can't won't isn't aren't wasn't weren't haven't hasn't hadn't couldn't shouldn't wouldn't mustn't");
var ADVS = set("always usually often sometimes never rarely seldom really also still just only even already ever normally generally " +
  "hardly actually probably certainly definitely frequently occasionally");
var CONJ = set("and but or so because when if that then while before after until though although where who which since unless whether than");
var SUBJ3 = set("he she it"), SUBJX = set("i you we they"), SUBJ = set("i you we they he she it");
var OBJ = set("me him her us them you");
var POSS = set("my your his her our their");
var DET = set("the a an this that these those my your his her our their its");
var INDEF = set("everybody everyone somebody someone nobody anyone anybody everything nothing something");
var WH = set("what where when why how who which whose");
var KIN = set("father mother brother sister friend teacher son daughter boss wife husband dad mom mum uncle aunt cousin grandfather " +
  "grandmother grandma grandpa baby child boy girl man woman neighbor neighbour doctor");
var PLSUBJ = set("people children men women police");
var NUMW = set("two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen " +
  "nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million dozen");
var QTY = set("many several these those both few various");
var UNC_STRICT = set("information advice furniture homework housework knowledge equipment luggage baggage evidence traffic weather " +
  "scenery jewelry jewellery software feedback progress permission news");
var UNC_SOFT = set("money water milk bread rice sugar salt tea juice food fruit meat cheese butter oil air rain snow sand work fun help " +
  "music time");
var NOPL = set("people police news series species means clothes glasses jeans scissors trousers pants goods thanks physics mathematics " +
  "economics politics athletics gymnastics hundred thousand million dozen percent yen o'clock");
var UNC_PL = map("informations:information advices:advice furnitures:furniture homeworks:homework houseworks:housework " +
  "knowledges:knowledge equipments:equipment luggages:luggage baggages:baggage evidences:evidence softwares:software " +
  "feedbacks:feedback sceneries:scenery jewelries:jewelry jewelleries:jewellery traffics:traffic");
var IRR_PL = map("man:men woman:women child:children person:people foot:feet tooth:teeth mouse:mice goose:geese sheep:sheep fish:fish " +
  "deer:deer knife:knives wife:wives life:lives leaf:leaves half:halves wolf:wolves shelf:shelves thief:thieves calf:calves loaf:loaves " +
  "potato:potatoes tomato:tomatoes hero:heroes echo:echoes moose:moose");
var BAD_PL = map("childs:children childrens:children womans:women womens:women mens:men foots:feet tooths:teeth sheeps:sheep " +
  "fishs:fish wifes:wives knifes:knives lifes:lives leafs:leaves wolfs:wolves halfs:halves thiefs:thieves shelfs:shelves " +
  "gooses:geese mouses:mice tomatos:tomatoes potatos:potatoes heros:heroes peoples:people persons:people");
var NO_APOS = map("dont:don't doesnt:doesn't didnt:didn't cant:can't couldnt:couldn't shouldnt:shouldn't wouldnt:wouldn't " +
  "isnt:isn't arent:aren't wasnt:wasn't werent:weren't havent:haven't hasnt:hasn't im:I'm ive:I've youre:you're theyre:they're " +
  "thats:that's whats:what's wheres:where's theres:there's shes:she's");
var SPLIT = map("alot:a_lot infront:in_front incase:in_case aswell:as_well atleast:at_least eachother:each_other thankyou:thank_you " +
  "everytime:every_time");
// short adjectives: -er/-est, never more/most
var SHORT_A = set("big small tall short long old young fast slow cheap high low hot cold warm cool nice large rich poor strong weak easy " +
  "happy busy early heavy pretty funny good bad near hard soft dark light clean great quick safe wide deep thin fat new late sad dry wet " +
  "dirty lucky ugly lazy noisy tiny cute smart fresh full bright thick sweet clear far");
var COMP_IRR = { good: ["better", "best"], bad: ["worse", "worst"], far: ["farther", "farthest"] };
// long adjectives: more/most, never -er/-est
var LONG_A = set("beautiful expensive interesting important difficult careful famous popular dangerous comfortable intelligent exciting " +
  "boring delicious useful helpful wonderful different successful crowded tired excited surprised honest modern serious");
// verbs that learners put after am/is/are by mistake ("I am agree"); none of them is an adjective or a common noun after be
var BE_V = set("agree disagree like love hate want need know understand believe think remember forget prefer live go come have eat " +
  "cook read write study wash talk call run work drink play study speak watch see hear feel enjoy visit travel teach learn sleep drive swim walk buy sell miss wait try ask write say " +
  "tell give take make do get leave sit stand dance sing listen look seem mean");
var STATIVE = set("agree disagree like love hate want need know understand believe think remember forget prefer have see hear seem mean");
// verbs that follow want/need/would like with "to"
var TO_V = set("go come eat buy see know learn speak become be have visit meet watch travel get take make do find live stay leave try " +
  "tell say ask write read study play sell send give start begin stop open close call understand help talk explain");
var ING_AFTER = set("enjoy enjoys enjoyed enjoying finish finishes finished avoid avoids avoided mind minds practice practise practiced " +
  "practises practised");
var JOB = set("student teacher doctor engineer nurse driver manager lawyer farmer worker writer singer actor actress artist pilot dentist " +
  "programmer designer chef waiter waitress officer secretary scientist musician painter player photographer journalist mechanic soldier " +
  "housewife businessman businesswoman shopkeeper baker hairdresser architect accountant tailor cook judge");
var HAVE_A = set("car house brother sister son daughter dog cat job problem question idea headache cold fever toothache stomachache " +
  "computer laptop phone bike bicycle pen boyfriend girlfriend husband wife baby garden apartment flat meeting test exam plan " +
  "appointment ticket passport umbrella camera");
var HAVE_BASE = set("go eat see write take give speak know forget be begin choose steal fall grow throw drive fly sing swim ride break " +
  "visit finish decide arrive live want try stay");
var DAYS = set("monday tuesday wednesday thursday friday saturday sunday mondays tuesdays wednesdays thursdays fridays saturdays sundays");
var MONTHS = set("january february march april may june july august september october november december");
var TIMEN = set("week month year weekend summer winter spring autumn fall monday tuesday wednesday thursday friday saturday sunday");
var CAPS = set("monday tuesday wednesday thursday friday saturday sunday january february april june july september october november " +
  "december english persian farsi french german spanish italian chinese japanese arabic turkish russian iranian american british " +
  "iran tehran england america france germany china japan canada london paris isfahan shiraz tabriz mashhad");
var GO = set("go goes went going gone come comes came coming get gets got getting return returns returned returning walk walks walked " +
  "walking drive drives drove driving run runs ran running");
var TO_SPORT = set("shopping swimming fishing skiing hiking camping jogging dancing running sightseeing");
var ADJ_BE = set("happy sad tired hungry thirsty busy ready sick ill fine late early cold hot angry afraid sorry right wrong free " +
  "bored boring interesting tall short beautiful young old rich poor single nervous worried excited sleepy okay ok good bad " +
  "hungry lucky lazy friendly kind careful famous");
var ADJ_ORDER = set("red blue green yellow black white brown pink orange purple grey gray big small new old beautiful expensive cheap " +
  "good bad long short tall nice little large huge ugly clean dirty hot cold");
var ADJ_PL = set("different important beautiful interesting expensive cheap famous young new small big old difficult easy");
/* old (archaic) and dialect English: shown as notes, never as errors. word -> [today's form, Persian note] */
var OLD_W = {
  thou: ["you", "thou یعنی «تو» (فاعل) و فعل بعدش ‎-st می‌گرفت (thou knowest = you know). امروزه فقط you."],
  thee: ["you", "thee یعنی «تو را / به تو» (مفعولِ thou). امروزه you."],
  thy: ["your", "thy یعنی «ـَت / مال تو». امروزه your."],
  thine: ["your", "thine یعنی «مال تو». امروزه yours یا your."],
  ye: ["you", "ye یعنی «شما». امروزه you."],
  hath: ["has", "hath شکل قدیمی has است."], doth: ["does", "doth شکل قدیمی does است."],
  dost: ["do", "dost (با thou) شکل قدیمی do است."], didst: ["did", "didst (با thou) شکل قدیمی did است."],
  hast: ["have", "hast (با thou) شکل قدیمی have است."], hadst: ["had", "hadst (با thou) شکل قدیمی had است."],
  shalt: ["will", "shalt (با thou) همان shall است؛ امروزه بیشتر will."], canst: ["can", "canst (با thou) همان can است."],
  couldst: ["could", "couldst همان could است."], wouldst: ["would", "wouldst همان would است."], shouldst: ["should", "shouldst همان should است."],
  wast: ["were", "wast (با thou) همان were است."], wert: ["were", "wert (با thou) همان were است."],
  saith: ["says", "saith شکل قدیمی says است."],
  digged: ["dug", "digged شکل قدیمی dug است."], awaked: ["awoke", "awaked شکل قدیمی awoke است."], spake: ["spoke", "spake شکل قدیمی spoke است."],
  builded: ["built", "builded شکل قدیمی built است."], shew: ["show", "shew شکل قدیمی show است."], shewed: ["showed", "shewed شکل قدیمی showed است."],
  lookee: ["look", "lookee تلفظ محاوره‌ای look است."],
  ere: ["before", "ere یعنی «قبل از / پیش از آنکه». امروزه before."],
  oft: ["often", "oft شکل قدیمی often است."], nay: ["no", "nay یعنی «نه». امروزه no."],
  hither: ["here", "hither یعنی «به اینجا». امروزه here."], thither: ["there", "thither یعنی «به آنجا». امروزه there."],
  whither: ["where", "whither یعنی «به کجا». امروزه where."], whence: ["where … from", "whence یعنی «از کجا». امروزه where … from."],
  betwixt: ["between", "betwixt شکل قدیمی between است."], methinks: ["I think", "methinks یعنی «به نظرم». امروزه I think."],
  perchance: ["perhaps", "perchance یعنی «شاید». امروزه perhaps یا maybe."], wherefore: ["why", "wherefore یعنی «چرا» (نه «کجا»). امروزه why."],
  whilst: ["while", "whilst هنوز در انگلیسی بریتانیایی رسمی هست، ولی شکل رایج امروز while است.", 1],
  amongst: ["among", "amongst هنوز در انگلیسی بریتانیایی هست، ولی among رایج‌تر است.", 1],
  "ain't": ["isn't", "ain't محاوره‌ی عامیانه است، به جای isn't / aren't / am not / haven't / hasn't. در انگلیسی معیار به کار نمی‌رود."],
  "hain't": ["haven't", "hain't محاوره‌ی قدیمی و عامیانه‌ی haven't / hasn't است."],
  afore: ["before", "afore شکل قدیمی و محلی before است."], allus: ["always", "allus تلفظ محلی always است."],
  summat: ["something", "summat تلفظ محلی something است."], nowt: ["nothing", "nowt یعنی «هیچی» (محلی). امروزه nothing."],
  mebbe: ["maybe", "mebbe تلفظ محلی maybe است."], wisht: ["wish", "wisht تلفظ محلی wish است."],
  agin: ["again", "agin تلفظ محلی again (یا against) است."], tha: ["you", "tha همان thou / you در لهجه‌ی یورکشایر است. امروزه you."]
};
var OLD_CUT = { o: ["of", "o' کوتاه‌شده‌ی of است (در نوشتن محاوره‌ی قدیمی)."], th: ["the", "th' کوتاه‌شده‌ی the است (لهجه)."],
  an: ["and", "an' کوتاه‌شده‌ی and است (محاوره)."], i: ["in", "i' کوتاه‌شده‌ی in است (لهجه)."], wi: ["with", "wi' کوتاه‌شده‌ی with است (لهجه)."] };
var OLD_AP = { m: ["them", "'m (بعد از فعل) کوتاه‌شده‌ی them است (محاوره)."], em: ["them", "'em کوتاه‌شده‌ی them است (محاوره)."], bout: ["about", "'bout کوتاه‌شده‌ی about است (محاوره)."],
  tis: ["it is", "'tis کوتاه‌شده‌ی قدیمی it is است. امروزه it's."], twas: ["it was", "'twas کوتاه‌شده‌ی قدیمی it was است."],
  twill: ["it will", "'twill کوتاه‌شده‌ی قدیمی it will است."], twere: ["it were", "'twere کوتاه‌شده‌ی قدیمی it were است."],
  ud: ["would", "'ud کوتاه‌شده‌ی would است (لهجه)."], un: ["one", "'un یعنی one (لهجه): a big 'un = a big one."] };
/* "an" before these was usual in older English (the h was weak); today "a" */
var H_OLD = set("hotel hotels historic historical history heroic hypothesis habitual hereditary hysterical humble hundred hostler horse house");
/* rules whose "wrong" form also appears in dialect speech in old stories */
var DIA = set("was there do3 dbl-neg irr-past pass-pp pp s3x pl-subj rel-comma");
var SUBJUNC = /\b(prefer|preferred|natural|important|essential|necessary|vital|crucial|imperative|urgent|suggestion|proposal|requirement|recommendation|demand|advisable|desirable|insisting|suggesting|demanding|recommending|requests?|requested|asks?|asked|insist(s|ed)?|suggest(s|ed)?|demand(s|ed)?|recommend(s|ed)?|propose[sd]?)\b/i;
var STAT_ING = set("knowing understanding wanting needing believing preferring belonging");
var ED_ADJ = set("worry bore tire excite interest surprise confuse scare frighten embarrass disappoint");
var POSS_N = set("book car house bag phone room pen bike friend brother sister mother father son daughter dog cat job family birthday name");
var PERSON = set("man woman men women boy girl boys girls person people child children kid kids guy guys friend friends student students");
var ACT = set("sing sings sang singing speak speaks spoke speaking play plays played playing work works worked working drive drives drove " +
  "driving cook cooks cooked cooking dance dances danced dancing swim swims swam swimming write writes wrote writing run runs ran running " +
  "sleep sleeps slept sleeping draw draws drew drawing");
var FREQ = set("always usually often sometimes never rarely seldom hardly");
var NEG_ANY = map("nothing:anything nobody:anybody nowhere:anywhere");
// B1: verbs with no passive (was happened -> happened)
var INTR = map("happened:happen occurred:occur died:die arrived:arrive disappeared:disappear happen:happen occur:occur die:die " +
  "arrive:arrive disappear:disappear");
// B1: separable phrasal verbs and their particles (turn off it -> turn it off)
var PHR = { pick: " up ", turn: " on off up down ", put: " on off away back down out ", take: " off out back away down ", give: " back up away ",
  throw: " away out ", "switch": " on off ", fill: " in out up ", look: " up ", write: " down ", "try": " on ", call: " back off ", wake: " up ",
  bring: " up back ", clean: " up ", tidy: " up ", hand: " in out back ", set: " up ", let: " down in out ", work: " out ", figure: " out ",
  find: " out ", pay: " back ", sort: " out ", drop: " off ", shut: " down off ", hang: " up ", cut: " off ", tear: " up ", pull: " down ", knock: " down " };
var PHR_F = Object.create(null);
// B1: verbs followed by -ing (consider buying), and by to + verb (refuse to go)
var ING_AFTER2 = set("consider considers considered considering deny denies denied denying delay delays delayed postpone postpones postponed " +
  "keep keeps kept imagine imagines imagined risk risks risked");
var TO_AFTER = set("refuse refuses refused agree agrees agreed promise promises promised decide decides decided manage manages managed afford " +
  "pretend pretends pretended threaten threatens threatened");
// B1: I hurt me -> myself
var REFL_V = set("hurt hurts cut cuts burn burns burned burnt enjoy enjoyed introduce introduced blame blamed teach taught see saw look looked " +
  "kill killed behave behaved express expressed");
// B2: have my car repaired (the verbs people most often have done for them, even though they are nouns too)
var CAUS_V = set("repair fix paint check test clean wash service install print translate deliver decorate iron remove replace build design " +
  "change examine photocopy develop dye style polish take");
var CAUS_OBJ = set("watch hair nails teeth eyes photo photograph picture clothes shoes suit dress computer laptop bike roof windows house flat " +
  "room kitchen bathroom garden car phone tv jacket coat trousers shirt");
var OBJ_SUBJ = map("me:I him:he her:she us:we them:they you:you");
var BE3 = map("i:am he:is she:is it:is you:are we:are they:are");
var BEPAST = map("i:was he:was she:was it:was you:were we:were they:were");

/* ---------- inflection ---------- */
function cvc(w) { // stop -> stopped: one short vowel between single consonants at the end of a one-vowel word
  return /(^|[^aeiou])[aeiou][bdgklmnprtv]$/.test(w) && (w.match(/[aeiouy]+/g) || []).length === 1 && !/^(qu)/.test(w) ||
    /^(prefer|refer|occur|admit|permit|regret|control|commit|omit|submit|transfer|equip|forbid|begin|forget|upset)$/.test(w);
}
function third(v) {
  if (v === "have") return "has"; if (v === "be") return "is";
  if (/(s|x|z|ch|sh)$/.test(v) || /[^o]o$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
function regPast(v) {
  if (/e$/.test(v)) return v + "d";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ied";
  if (cvc(v)) return v + v.slice(-1) + "ed";
  return v + "ed";
}
function past(v) { return IRR[v] ? IRR[v][0] : regPast(v); }
function part(v) { return IRR[v] ? IRR[v][1] : regPast(v); }
function ing(v) {
  if (v === "be") return "being";
  if (/ie$/.test(v)) return v.slice(0, -2) + "ying";
  if (/(ee|oe|ye)$/.test(v)) return v + "ing";
  if (/[^e]e$/.test(v)) return v.slice(0, -1) + "ing";
  if (cvc(v)) return v + v.slice(-1) + "ing";
  return v + "ing";
}
function plural(n) {
  if (IRR_PL[n]) return IRR_PL[n];
  if (/(s|x|z|ch|sh)$/.test(n)) return n + "es";
  if (/[^aeiou]y$/.test(n)) return n.slice(0, -1) + "ies";
  return n + "s";
}
// a longer -s word the lists do not know (plantations): probably a plural noun, not a verb
function unknownPl(w) { return /^[a-z]{3,}s$/.test(w) && !/(ss|us|is)$/.test(w) && !T3[w] && !V[w] && !A[w] && !N[w] && !PL[w]; }
function comp(a, k) { // k 0: -er, 1: -est
  if (COMP_IRR[a]) return COMP_IRR[a][k];
  var e = k ? "est" : "er";
  if (/e$/.test(a)) return a + e.slice(1);
  if (/[^aeiou]y$/.test(a)) return a.slice(0, -1) + "i" + e;
  if (cvc(a) && !/w$/.test(a)) return a + a.slice(-1) + e;
  return a + e;
}
function article(w) { // "a" or "an" by the sound of the next word
  var l = w.toLowerCase();
  if (/^(hour|honest|honou?r|heir)/.test(l)) return "an";
  if (/^[A-Z]{2,4}$/.test(w)) return /^[AEFHILMNORSX]/.test(w) ? "an" : "a";
  if (/^(uni(?!n|m|d)|unanim|us[eua]|ut[ieo]|ur[aieo]|uku|ubiq|uga|ukr|ufo|eu|ew|one|once|oui)/.test(l)) return "a";
  return /^[aeiou]/.test(l) ? "an" : "a";
}

/* ---------- word lists from grammar.json ---------- */
var V, N, A, N2, A2, T3, PAST, PP, ING, PL, WRONG_S, WRONG_ING, WRONG_ED, WRONG_PAST, WRONG_COMP, COMP_OF, SUP_OF, SAMEPAST, ready = false;
var VCOM = "accept add agree allow answer appear arrive ask bake begin believe belong borrow break bring build buy call carry catch change " +
  "check choose clean climb close collect come complain cook cost count cover cry cut dance decide describe die disagree discover do draw " +
  "dream dress drink drive drop eat end enjoy enter explain fall feel fight fill find finish fix fly follow forget forgive get give go grow " +
  "guess happen hate have hear help hide hit hold hope hurry hurt imagine improve invite join jump keep kiss know laugh learn leave lend " +
  "lie like listen live look lose love make marry matter mean meet miss move need open order own pack paint pass pay pick plan play " +
  "practice practise prefer prepare promise pull push put rain reach read remember rent repair repeat reply return ride ring run save say " +
  "see sell send share shop shout show sing sit sleep smell smile snow sound speak spell spend stand start stay steal stop study swim " +
  "take talk taste teach tell thank think throw touch travel try turn understand use visit wait wake walk want wash watch wear win wish " +
  "work worry write seem become cause create develop expect include provide remain suggest support wonder apologize argue arrange attend " +
  "avoid bite blow boil brush burn celebrate cheat choose clap communicate compare complete connect continue copy cross deliver depend " +
  "design destroy disappear discuss divide doubt download earn encourage exercise exist fail feed fit fold freeze greet hang hug joke " +
  "knock land lift lock measure mention mix notice obey offer organize park perform plant pour pretend print produce protect prove " +
  "receive recognize recommend reduce refuse relax rely remove rest retire rob rush search shake shine shoot sign sink skate ski smoke " +
  "solve sort spill spread stare succeed suffer surprise switch tear tidy tie translate trust type vote warn waste weigh whisper wrap yell";

function init(lx) {
  lx = lx || {};
  V = set(VCOM + " " + (lx.v || "")); ["be", "can", "will", "must", "may", "might", "shall", "should", "would", "could", "ought"].forEach(function (w) { delete V[w]; });
  N = set((lx.n || "") + " " + Object.keys(JOB).join(" ") + " " + Object.keys(HAVE_A).join(" ") + " " + Object.keys(KIN).join(" "));
  Object.keys(UNC_STRICT).concat(Object.keys(UNC_SOFT), Object.keys(NOPL)).forEach(function (w) { delete N[w]; });
  N2 = set((lx.n || "") + " " + (lx.n2 || "")); A2 = set((lx.a || "") + " " + (lx.a2 || ""));
  A = set((lx.a || "") + " " + Object.keys(SHORT_A).join(" ") + " " + Object.keys(LONG_A).join(" ") + " " + Object.keys(ADJ_ORDER).join(" "));
  T3 = Object.create(null); PAST = Object.create(null); PP = Object.create(null); ING = Object.create(null); PL = Object.create(null);
  SAMEPAST = Object.create(null);
  Object.keys(V).forEach(function (v) {
    var t = third(v), p = past(v), q = part(v), g = ing(v);
    if (t !== v) T3[t] = v;
    if (p !== v) PAST[p] = v; else SAMEPAST[v] = 1;
    if (q !== v) PP[q] = v;
    ING[g] = v;
  });
  Object.keys(ALT_PAST).forEach(function (f) { PAST[f] = PP[f] = ALT_PAST[f]; });
  T3.has = "have"; T3.does = "do"; T3.goes = "go";
  // watchs, studys, gos: common verbs with the wrong -s spelling
  WRONG_S = Object.create(null); WRONG_ING = Object.create(null); WRONG_ED = Object.create(null);
  // studyed, stoped, plaied, planed: regular verbs with the wrong -ed spelling
  VCOM.split(" ").forEach(function (v) {
    if (IRR[v]) return;
    var d = regPast(v);
    [v + "ed", v + v.slice(-1) + "ed", /y$/.test(v) ? v.slice(0, -1) + "ied" : ""].forEach(function (f) {
      if (f && f !== d && f.length > 4 && !/lled$/.test(f) && !PAST[f] && !V[f] && !N[f] && !A[f] && !PL[f] && !REAL_ED[f]) WRONG_ED[f] = d;
    });
  });
  // writeing, swiming, openning: common verbs with the wrong -ing spelling
  VCOM.split(" ").forEach(function (v) {
    var g = ing(v);
    [v + "ing", v + v.slice(-1) + "ing"].forEach(function (f) {
      if (f !== g && f.length > 4 && !/lling$/.test(f) && !ING[f] && !V[f] && !N[f] && !A[f] && !PL[f]) WRONG_ING[f] = g;
    });
  });
  VCOM.split(" ").forEach(function (v) { var t = third(v); if (t !== v + "s" && !V[v + "s"] && !N[v + "s"] && !PL[v + "s"]) WRONG_S[v + "s"] = t; });
  // past forms listed as verbs in the lexicon (said, fell, felt) are not base verbs
  Object.keys(IRR).forEach(function (v) { IRR[v].forEach(function (f) { if (f !== v && !IRR[f]) delete V[f]; }); });
  Object.keys(V).forEach(function (w) { if (/ed$/.test(w) && PAST[w] && PAST[w] !== w && V[PAST[w]]) delete V[w]; });
  Object.keys(N).forEach(function (n) { var p = plural(n); if (p !== n) PL[p] = n; });
  Object.keys(IRR_PL).forEach(function (n) { if (IRR_PL[n] !== n) PL[IRR_PL[n]] = n; });
  WRONG_PAST = Object.create(null);
  Object.keys(IRR).forEach(function (v) {
    [regPast(v), v + "ed", /e$/.test(v) ? v + "d" : "", v + v.slice(-1) + "ed"].forEach(function (f) {
      if (f && f !== IRR[v][0] && f !== IRR[v][1] && !REAL_ED[f] && !ALT_PAST[f]) WRONG_PAST[f] = v;
    });
  });
  Object.keys(PHR).forEach(function (v) { [v, third(v), past(v), part(v), ing(v)].forEach(function (f) { PHR_F[f] = v; }); });
  WRONG_COMP = Object.create(null); COMP_OF = Object.create(null); SUP_OF = Object.create(null);
  Object.keys(SHORT_A).forEach(function (a) { COMP_OF[comp(a, 0)] = a; SUP_OF[comp(a, 1)] = a; });
  WRONG_COMP.gooder = "better"; WRONG_COMP.goodest = "best"; WRONG_COMP.badder = "worse"; WRONG_COMP.baddest = "worst";
  Object.keys(LONG_A).forEach(function (a) {
    WRONG_COMP[/e$/.test(a) ? a + "r" : a + "er"] = "more " + a;
    WRONG_COMP[/e$/.test(a) ? a + "st" : a + "est"] = "most " + a;
  });
  ready = true;
}

/* ---------- collocations: words that always go together (B1 lesson "collocations") ----------
   CO_VN: [wrong verbs, right verb, nouns ("_" joins two words), what may stand before the noun, Persian hint, English hint, extra]
     before the noun: "" = a / the / my / some / numbers / adjectives … (up to 4 words), "a" = only a/an (+ adjectives),
     "0" = nothing, "a0" = a/an or nothing, "the" = only "the", "poss" = only my/your/his ….
     extra: {x: words after the noun that stop the rule, alt: another right verb, me: only after I / we}
   CO_AN: [wrong adjective, right adjective, nouns, Persian hint, English hint, alt adjective] */
var CO_VN = [
  ["do", "make", "mistake mistakes decision decisions noise effort efforts phone_call phone_calls money friends progress suggestion suggestions promise promises excuse excuses choice choices complaint complaints mess difference comment comments reservation appointment offer discovery discoveries attempt fortune sense", "",
    "make برای «ساختن و به وجود آوردن» است: make a mistake، make a decision، make money، make friends، make a noise.", "make a mistake / a decision / money / friends / a noise"],
  ["make", "do", "homework housework shopping laundry washing cleaning ironing research damage harm business exercise exercises", "",
    "do برای کارها و وظیفه‌هاست: do homework، do the shopping، do the dishes، do exercise، do research.", "do homework / the shopping / exercise / research", { x: "of" }],
  ["make", "do", "sport sports", "0", "do برای کارها و وظیفه‌هاست: do sport، do exercise.", "do sport", { x: "of for" }],
  ["make", "do", "dishes", "the", "do برای کارها و وظیفه‌هاست: do the dishes، do the shopping، do homework.", "do the dishes"],
  ["make", "do", "favor favour", "a", "«لطفی کردن» do است: Could you do me a favor?", "do someone a favor"],
  ["make", "do", "best", "poss", "«تمام تلاشم را کردن» do my best است.", "do your best"],
  ["make", "take", "photo photos", "a0", "«عکس گرفتن» take a photo است.", "take a photo"],
  ["make", "take", "shower walk nap", "a", "برای دوش گرفتن، قدم زدن و چرت زدن take می‌آید: take a shower، take a walk.", "take a shower / a walk / a nap", { x: "of" }],
  ["make", "take", "break", "a!", "«استراحت کوتاه کردن» take a break است.", "take a break", { x: "for from with through away in into out to toward towards" }],
  ["make", "have", "party", "a", "«مهمانی گرفتن» have a party (یا throw a party) است.", "have / throw a party", { alt: "throw" }],
  ["make do", "pay", "attention", "0", "«توجه کردن» pay attention است: Pay attention to the teacher.", "pay attention"],
  ["make", "commit", "crime crimes sin sins", "a0", "«جرم یا گناه کردن» commit a crime / commit a sin است.", "commit a crime"],
  ["do", "commit", "crime sin", "a", "«جرم یا گناه کردن» commit a crime / commit a sin است.", "commit a crime"],
  ["see", "have", "dream dreams nightmare nightmares", "", "«خواب دیدن» در انگلیسی have a dream است، نه see: I had a strange dream.", "have a dream"],
  ["eat", "take", "medicine medicines pill pills tablet tablets", "", "«دارو خوردن» در انگلیسی take medicine است، نه eat.", "take medicine / a pill"],
  ["drink", "smoke", "cigarette cigarettes", "", "«سیگار کشیدن» smoke a cigarette است.", "smoke a cigarette"],
  ["say", "tell", "truth", "",
    "با truth، lie، story و joke فعل tell می‌آید: tell the truth، tell a lie، tell a story.", "tell the truth / a lie / a story / a joke"],
  ["say", "tell", "lie story joke", "a", "با lie، truth، story و joke فعل tell می‌آید: tell the truth، tell a lie، tell a story.", "tell the truth / a lie / a story / a joke"],
  ["tell", "say", "hello goodbye sorry thanks", "0", "با hello، goodbye، sorry و thanks فعل say می‌آید: say hello، say sorry.", "say hello / goodbye / sorry / thanks"],
  ["open", "turn on", "light lights lamp tv television radio fan heater air_conditioner", "d",
    "چراغ و وسیله‌ی برقی را turn on / turn off می‌کنیم، نه open / close: Turn on the light.", "turn on / turn off the light, the TV"],
  ["close", "turn off", "light lights lamp tv television radio fan heater air_conditioner", "d",
    "چراغ و وسیله‌ی برقی را turn on / turn off می‌کنیم، نه open / close: Turn off the TV.", "turn on / turn off the light, the TV"],
  ["drive", "ride", "bike bikes bicycle bicycles", "", "دوچرخه و موتور را ride می‌کنیم؛ drive برای ماشین است: ride a bike.", "ride a bike (drive a car)"],
  ["lose", "miss", "bus train plane flight", "", "«از اتوبوس یا قطار جا ماندن» miss the bus است، نه lose.", "miss the bus / the train", { x: "of" }],
  ["eat take", "catch", "cold", "a", "«سرما خوردن» catch a cold است: I caught a cold.", "catch a cold"],
  ["say", "ask", "question questions", "", "«سؤال پرسیدن» ask a question است، نه say.", "ask a question"],
  ["say", "give", "speech", "a", "«سخنرانی کردن» give a speech (یا make a speech) است.", "give / make a speech", { alt: "make" }],
  ["put", "set", "alarm", "a", "«زنگ ساعت را تنظیم کردن» set an alarm است.", "set an alarm", { x: "on in under into near next beside by behind" }],
  ["wash", "brush", "teeth", "poss", "«مسواک زدن» brush your teeth است، نه wash.", "brush your teeth"],
  ["give", "take", "exam exams", "", "«امتحان دادن» (برای دانش‌آموز) take an exam است؛ give an exam یعنی معلم امتحان بگیرد.", "take an exam (the teacher gives it)", { me: 1 }]
];
var CO_AN = [
  ["strong", "heavy", "rain rains snow snowfall traffic smoker smokers drinker drinkers", "باران و برف و ترافیک زیاد heavy است: heavy rain، heavy traffic، a heavy smoker.", "heavy rain / traffic / smoker"],
  ["big", "heavy", "rain traffic", "باران و ترافیک زیاد heavy است: heavy rain، heavy traffic.", "heavy rain / traffic"],
  ["heavy", "strong", "coffee tea", "چای و قهوه‌ی پررنگ strong است: strong coffee.", "strong coffee / tea"],
  ["strong", "high", "fever temperature", "تب بالا high fever است.", "a high fever"],
  ["high", "tall", "man men woman women boy boys girl girls person", "برای قد آدم tall می‌آید؛ high برای ارتفاع چیزهاست (a high wall).", "a tall man (high is for things)"],
  ["long", "tall", "man woman boy girl person", "برای قد آدم tall می‌آید، نه long.", "a tall man"],
  ["small", "little", "brother sister", "«برادر یا خواهر کوچک‌تر» little brother یا younger brother است.", "little / younger brother", "younger"],
  ["expensive", "high", "price prices", "قیمت گران نیست، بالاست: a high price (و قیمت ارزان: a low price). خود جنس expensive است.", "a high price (the thing is expensive)"],
  ["high", "loud", "music noise", "برای صدای بلند loud می‌آید: loud music.", "loud music / noise"]
];
var CO_GO = set("trip trips holiday holidays vacation vacations tour journey cruise honeymoon excursion");
var CO_BY = set("car bus train taxi plane subway metro bike bicycle boat ship");
var CO_NEXT = set("in on at of for with to from about by during after before since until till every each today tonight yesterday tomorrow now again together alone first last next this all here there yet too please instead anymore later soon once twice as like and but or so because when if while");
var CO_QTY = set("some any no another other such many much few several more most lot lots couple one two three four five six seven eight nine ten every each all this these those big small huge terrible very really so too quite real");
var COV = Object.create(null);   // wrong verb form -> [base, form]
CO_VN.forEach(function (r) { r[0].split(" ").forEach(function (v) {
  [[v, "b"], [third(v), "s"], [past(v), "p"], [part(v), "q"], [ing(v), "g"]].forEach(function (f) { if (!COV[f[0]] || f[1] === "b") COV[f[0]] = [v, f[1] === "q" && past(v) === part(v) ? "p" : f[1]]; });
}); });

/* ---------- messages: [Persian, English, lesson id] ---------- */
var MSG = {
  "an": ["قبل از کلمه‌ای که با صدای صدادار (آ، اِ، ای، او) شروع می‌شود an می‌آید، نه a.", "Use “an” before a vowel sound.", "articles"],
  "a": ["قبل از صدای بی‌صدا a می‌آید، نه an؛ حتی اگر حرف اول u یا eu باشد (a university).", "Use “a” before a consonant sound.", "articles"],
  "s3": ["بعد از he / she / it (و هر فاعل مفرد) در حال ساده، فعل -s می‌گیرد.", "After he/she/it the present simple verb takes -s.", "present-simple"],
  "s3x": ["بعد از I / you / we / they و فاعل جمع، فعل -s نمی‌گیرد.", "No -s after I/you/we/they or a plural subject.", "present-simple"],
  "be": ["شکل درست be: I am، he / she / it is، you / we / they are.", "I am, he/she/it is, you/we/they are.", "be"],
  "was": ["در گذشته: I / he / she / it was، و you / we / they were.", "I/he/she/it was, you/we/they were.", "past-be"],
  "there": ["there is / was برای مفرد، there are / were برای جمع.", "There is + singular, there are + plural.", "there-is"],
  "do3": ["با he / she / it از does / doesn't استفاده می‌شود، و با I / you / we / they از do / don't.", "does/doesn't with he/she/it; do/don't with I/you/we/they.", "present-simple-nq"],
  "base-do": ["بعد از do / does / did (و don't / doesn't / didn't) فعل ساده می‌آید: بدون -s و بدون شکل گذشته.", "After do/does/did use the base verb.", "present-simple-nq"],
  "modal-to": ["بعد از can / must / should / will و مانند آن‌ها to نمی‌آید.", "No “to” after can, must, should, will…", "modals"],
  "lets-base": ["بعد از Let's شکل ساده‌ی فعل می‌آید (بدون ‎-ing): Let's go.", "Use the base verb after Let's: Let's go.", "imperatives"],
  "modal-base": ["بعد از can / must / should / will و مانند آن‌ها فعل ساده می‌آید (بدون -s، -ed یا -ing).", "Base verb after can, must, will…", "modals"],
  "pl": ["بعد از عدد بیشتر از یک، many، these، those و several اسم جمع می‌آید.", "Plural noun after numbers, many, these, those.", "plurals"],
  "sg": ["بعد از a / an / one / each / every اسم مفرد می‌آید.", "Singular noun after a/an/one/each/every.", "plurals"],
  "this": ["this / that برای مفرد است؛ برای جمع these / those.", "this/that + singular, these/those + plural.", "this-that"],
  "one-of": ["بعد از one of اسم جمع می‌آید: one of my friends.", "“one of” + plural noun.", "plurals"],
  "unc": ["این اسم غیرقابل‌شمارش است: جمع بسته نمی‌شود و a / an نمی‌گیرد (a piece of advice).", "Uncountable: no plural, no a/an.", "countable"],
  "much": ["much برای اسم غیرقابل‌شمارش است و many برای اسم جمع.", "much + uncountable, many + plural.", "countable"],
  "irr-pl": ["این اسم جمعِ بی‌قاعده دارد.", "This noun has an irregular plural.", "plurals"],
  "people": ["people خودش جمع است (یعنی «آدم‌ها») و peoples فقط به معنی «ملت‌ها» است.", "“people” is already plural.", "plurals"],
  "irr-past": ["این فعل بی‌قاعده است و گذشته‌اش با -ed ساخته نمی‌شود.", "Irregular verb: no -ed.", "past-simple"],
  "pp": ["بعد از have / has / had شکل سوم فعل (past participle) می‌آید.", "have/has/had + past participle.", "present-perfect"],
  "more-er": ["صفت برتر یا با -er ساخته می‌شود یا با more؛ هر دو با هم نه.", "Use -er or more, not both.", "comparatives"],
  "short-er": ["صفت‌های کوتاه (یک‌بخشی و -y) با -er / -est برتر می‌شوند، نه با more / most.", "Short adjectives take -er/-est.", "comparatives"],
  "long-er": ["صفت‌های بلند با more / most برتر می‌شوند، نه با -er / -est.", "Long adjectives take more/most.", "comparatives"],
  "than": ["بعد از صفت برتر than می‌آید (then یعنی «بعد / آن‌وقت»).", "Comparative + than (not then).", "comparatives"],
  "as-as": ["ساختار «به همان اندازه» as ... as است، نه as ... than.", "as … as, not as … than.", "comparatives"],
  "same-as": ["the same as درست است (نه the same than / like).", "the same as", "comparatives"],
  "q-order": ["در سؤال، فعل کمکی (is / are / can / do ...) قبل از فاعل می‌آید.", "In questions the helping verb comes before the subject.", "questions"],
  "q-do": ["سؤال با فعل اصلی do / does / did لازم دارد.", "Questions with a main verb need do/does/did.", "questions"],
  "q-modal": ["can / will / should خودشان سؤال می‌سازند و do نمی‌خواهند.", "can/will/should make the question without do.", "modals"],
  "q-be-do": ["سؤالِ فعل اصلی با do / does / did ساخته می‌شود، نه با am / is / are.", "Main verbs make questions with do/does/did, not be.", "present-simple-nq"],
  "be-verb": ["این کلمه خودش فعل است و am / is / are لازم ندارد (فارسی «موافقم» = I agree).", "This verb does not need am/is/are.", "present-simple"],
  "be-ing": ["برای حال استمراری، am / is / are قبل از فعل -ing لازم است.", "Present continuous needs am/is/are + -ing.", "present-continuous"],
  "be-adj": ["قبل از صفت، am / is / are لازم است (در «خسته‌ام» همان «ـَم» است: I am tired).", "Use am/is/are before an adjective.", "be"],
  "age": ["سن را با be می‌گویند نه have: I am 20 (years old).", "Age uses be: I am 20.", "be"],
  "age-old": ["بعد از years برای سن old می‌آید: I am 20 years old (یا فقط I am 20).", "… years old", "be"],
  "on-day": ["برای روزهای هفته on به کار می‌رود: on Monday.", "on + day", "prep-time"],
  "in-month": ["برای ماه، سال و فصل in به کار می‌رود: in May، in 2020.", "in + month/year", "prep-time"],
  "at-time": ["برای ساعت at به کار می‌رود: at 5 o'clock، at night.", "at + clock time", "prep-time"],
  "in-the-m": ["in the morning / afternoon / evening، ولی at night.", "in the morning", "prep-time"],
  "no-prep": ["قبل از next / last / this / every حرف اضافه نمی‌آید: next week.", "No preposition before next/last/this/every.", "prep-time"],
  "go-home": ["home بعد از go / come / get حرف اضافه نمی‌گیرد: go home.", "go home (no “to”)", "verb-prep"],
  "go-there": ["there و here حرف اضافه‌ی to نمی‌گیرند: go there.", "go there (no “to”)", "verb-prep"],
  "go-ing": ["برای کارهای تفریحی go + -ing بدون to: go shopping.", "go shopping (no “to”)", "verb-prep"],
  "listen-to": ["listen همیشه با to می‌آید: listen to music.", "listen to", "verb-prep"],
  "look-at": ["برای «نگاه کردن به» look at لازم است.", "look at", "verb-prep"],
  "wait-for": ["«منتظر کسی بودن» wait for است: wait for me.", "wait for", "verb-prep"],
  "married-to": ["married to (نه with)؛ و خود marry حرف اضافه نمی‌خواهد: marry him.", "married to / marry someone", "verb-prep"],
  "discuss": ["discuss خودش یعنی «بحث کردن درباره‌ی» و about نمی‌خواهد.", "discuss (no “about”)", "verb-prep"],
  "explain-to": ["explain something to someone: explain it to me (نه explain me).", "explain to me", "verb-prep"],
  "say-tell": ["برای گفتن «به کسی» tell می‌آید: tell me (یا say to me).", "tell me / say to me", "verb-prep"],
  "tell-to": ["tell بدون to می‌آید: tell him.", "tell him (no “to”)", "verb-prep"],
  "afraid-of": ["afraid of / scared of (نه from، با اینکه فارسی «از» می‌گوید).", "afraid of", "verb-prep"],
  "interested-in": ["interested in درست است.", "interested in", "verb-prep"],
  "good-at": ["برای مهارت good at / bad at به کار می‌رود.", "good at", "verb-prep"],
  "depend-on": ["depend on درست است (نه of / to / from).", "depend on", "verb-prep"],
  "enter": ["enter خودش یعنی «وارد ... شدن» و to نمی‌خواهد: enter the room.", "enter (no “to”)", "verb-prep"],
  "arrive": ["arrive in (شهر و کشور) یا arrive at (جای کوچک‌تر)، نه arrive to.", "arrive in/at", "verb-prep"],
  "reach": ["reach خودش یعنی «رسیدن به» و to نمی‌خواهد.", "reach (no “to”)", "verb-prep"],
  "on-net": ["on the internet / on TV / on the radio.", "on the internet", "verb-prep"],
  "lack": ["فعل lack حرف اضافه نمی‌خواهد (ولی اسمِ lack of درست است).", "lack (verb) without “of”", "verb-prep"],
  "return-back": ["return خودش یعنی «برگشتن»؛ back اضافه است.", "return (no “back”)", "verb-prep"],
  "dbl-neg": ["در انگلیسی دو منفی با هم نمی‌آید: I don't have anything (نه nothing).", "No double negatives.", "some-any"],
  "its": ["it's = it is؛ its یعنی «ـَش (مال آن)».", "it's = it is", "pronouns"],
  "its2": ["its یعنی «ـَش (مال آن)»؛ it's = it is.", "its = belonging to it", "pronouns"],
  "youre": ["you're = you are؛ your یعنی «ـِت / مال تو».", "you're = you are", "pronouns"],
  "your": ["your یعنی «ـِت / مال تو»؛ you're = you are.", "your = belonging to you", "pronouns"],
  "their": ["their یعنی «مال آن‌ها»؛ there یعنی «آنجا» یا there is.", "their = belonging to them", "pronouns"],
  "there2": ["there is / there are (نه their).", "there is / are", "there-is"],
  "me-too": ["«من هم» = me too.", "me too", "adverbs"],
  "cap-i": ["«من» در انگلیسی همیشه با حرف بزرگ نوشته می‌شود: I.", "“I” is always a capital.", "pronouns"],
  "cap": ["نام روزها، ماه‌ها، زبان‌ها، ملیت‌ها و جاها با حرف بزرگ شروع می‌شود.", "Days, months, languages and places take a capital.", "adjectives"],
  "cap-start": ["جمله با حرف بزرگ شروع می‌شود.", "Start a sentence with a capital.", ""],
  "the-my": ["the با my / your / his و مانند آن‌ها با هم نمی‌آیند.", "Not “the my” or “a my”.", "articles"],
  "a-need": ["اسمِ مفردِ قابل‌شمارش تنها نمی‌آید؛ a / an (یا my / the ...) لازم دارد.", "A singular countable noun needs a/an.", "articles"],
  "a-job": ["قبل از شغل (مفرد) a / an می‌آید: He is a teacher.", "a/an before a job.", "articles"],
  "since-for": ["for + مدت زمان (for 3 years)؛ since + نقطه‌ی شروع (since 2020).", "for + a period, since + a starting point.", "since-for"],
  "past-time": ["با yesterday / last ... / ago فعل گذشته می‌آید.", "Past time words need the past simple.", "past-simple"],
  "want-to": ["بعد از want / need / would like و مانند آن‌ها to + فعل می‌آید.", "want to + verb", "verb-patterns"],
  "enjoy-ing": ["بعد از enjoy / finish / avoid / mind فعل -ing می‌آید: I enjoy swimming.", "enjoy + -ing", "verb-patterns"],
  "let-to": ["بعد از let / make + مفعول، فعل بدون to می‌آید: let me go.", "let me go (no “to”)", "verb-patterns"],
  "forward-ing": ["look forward to + فعل -ing: I look forward to seeing you.", "look forward to + -ing", "verb-patterns"],
  "adj-pl": ["صفت در انگلیسی جمع بسته نمی‌شود: different countries.", "Adjectives have no plural.", "adjectives"],
  "adj-order": ["در انگلیسی صفت قبل از اسم می‌آید (برعکس فارسی): a red car.", "Adjective before the noun: a red car.", "adjectives"],
  "very-like": ["very قبل از فعل نمی‌آید: I really like it یا I like it very much.", "Not “very like”: really like / like … very much.", "adverbs"],
  "me-and": ["در جای فاعل: My friend and I (نه Me and my friend).", "Subject: “My friend and I”.", "pronouns"],
  "split": ["این دو کلمه جدا نوشته می‌شوند.", "These are two words.", ""],
  "spell-s": ["بعد از s، sh، ch، x و o ‎-es می‌آید (watches، goes) و بی‌صدا + y می‌شود ‎-ies (studies).", "Spelling of -s: watches, goes, studies.", "present-simple"],
  "freq": ["قیدهای always / usually / never ... قبل از فعل اصلی می‌آیند ولی بعد از am / is / are.", "Frequency adverbs go before the main verb but after be.", "frequency"],
  "have-got": ["have got بدون do سؤالی و منفی می‌شود: Have you got ...? / I haven't got ...", "have got: no do in questions.", "have-got"],
  "spell-ing": ["املای ‎-ing: e آخر حذف می‌شود (writing) و در فعل‌های کوتاهِ «صدادار + بی‌صدا» حرف آخر دوتا می‌شود (swimming).", "Spelling of -ing: writing, swimming.", "present-continuous"],
  "stative": ["فعل‌های حالت (know، want، understand، need ...) معمولاً ‎-ing نمی‌گیرند.", "State verbs are not used in the continuous.", "simple-continuous"],
  "can-s": ["can / must / should هیچ‌وقت ‎-s نمی‌گیرند: she can.", "Modal verbs never take -s.", "can"],
  "imp-to": ["بعد از don't و let's فعل ساده بدون to می‌آید: Don't worry. / Let's go.", "No “to” after don't / let's.", "imperatives"],
  "imp-not": ["امر منفی با Don't ساخته می‌شود: Don't touch it.", "Negative imperative: Don't + verb.", "imperatives"],
  "ed-adj": ["برای حال آدم صفت ‎-ed می‌آید: I am worried / bored / tired (نه I am worry).", "Feelings: worried, bored, tired.", "adjectives"],
  "poss-s": ["برای «مالِ کسی» ‎'s لازم است: Sara's book.", "Possession: Sara's book.", "possessive-s"],
  "spell-ed": ["املای ‎-ed: بی‌صدا + y می‌شود ‎-ied (studied)، و در فعل‌های کوتاهِ «صدادار + بی‌صدا» حرف آخر دوتا می‌شود (stopped).", "Spelling of -ed: studied, stopped.", "past-simple"],
  "on-surface": ["برای روی سطح (دیوار، میز، زمین) on به کار می‌رود.", "on the wall / on the table", "prep-place"],
  "going-base": ["بعد از going to فعل ساده می‌آید: I'm going to call.", "going to + base verb", "going-to"],
  "to-base": ["بعد از to (want to، need to ...) فعل ساده می‌آید.", "to + base verb", "verb-patterns"],
  "pp-for": ["برای کاری که از گذشته شروع شده و تا حالا ادامه دارد (با for / since) حال کامل لازم است: I have known him for years.", "Up to now with for/since: present perfect.", "since-for"],
  "because-so": ["because و so در یک جمله با هم نمی‌آیند (و although و but هم همین‌طور).", "Not “because … so” or “although … but”.", "conjunctions"],
  "if-will": ["بعد از if برای آینده حال ساده می‌آید، نه will: If it rains, ...", "if + present simple for the future", "conjunctions"],
  "who": ["برای آدم who به کار می‌رود (یا that)، و which برای چیز.", "who for people, which for things", "relative"],
  "rel-pron": ["بعد از who / which / that ضمیر تکرار نمی‌شود: the book which I bought (نه bought it).", "No extra pronoun after who/which/that.", "relative"],
  "good-well": ["برای فعل قید لازم است: well (نه good). She sings well.", "Adverb: well, not good.", "adverbs"],
  "enough": ["enough بعد از صفت می‌آید: old enough.", "adjective + enough", "adverbs"],
  "some-any": ["در جمله‌ی منفی any می‌آید: I don't have any money.", "any in negatives", "some-any"],
  "apos": ["در شکل کوتاه، آپاستروف (') جای حرف حذف‌شده را می‌گیرد: don't = do not، I'm = I am.", "Short forms need an apostrophe: don't, I'm.", "be"],
  "pass-pp": ["در جمله‌ی مجهول بعد از am / is / was / been / being شکل سوم فعل (past participle) می‌آید: was written، is built.", "Passive: be + past participle.", "passive"],
  "pass-intr": ["happen / die / arrive / disappear مجهول نمی‌شوند و be نمی‌خواهند: It happened (نه was happened).", "happen, die, arrive have no passive.", "passive"],
  "ppc": ["برای کاری که از گذشته شروع شده و هنوز ادامه دارد (با for / since) حال کامل استمراری لازم است: I have been waiting for two hours.", "From the past up to now: present perfect continuous.", "pp-continuous"],
  "ppc-ing": ["بعد از have / has been فعل ‎-ing می‌آید: I have been working.", "have been + -ing", "pp-continuous"],
  "already-had": ["کاری که قبل از یک کار دیگر در گذشته تمام شده بود، گذشته‌ی کامل می‌خواهد: had already left.", "The earlier past action: past perfect.", "past-perfect"],
  "used-to": ["used to + فعل ساده = «قبلاً ... می‌کردم»؛ be / get used to + ‎-ing = «به ... عادت داشتن / کردن».", "used to + verb; be used to + -ing.", "used-to"],
  "time-will": ["بعد از when / as soon as / before / after / until برای آینده حال ساده می‌آید، نه will.", "No “will” after when, before, until … for the future.", "future-forms"],
  "unless-not": ["unless خودش یعنی «اگر ... نه»؛ فعل بعدش منفی نمی‌شود.", "unless already means “if … not”.", "first-conditional"],
  "if-would": ["در شرطی نوع دوم بعد از if گذشته می‌آید، نه would: If I had / If I were ...", "Second conditional: if + past, not would.", "second-conditional"],
  "ind-q": ["در سؤال غیرمستقیم (Do you know / Tell me / I don't know ...) ترتیب مثل جمله‌ی خبری است: where the station is، where he lives.", "Indirect questions use statement order.", "indirect-questions"],
  "said-told": ["tell مفعول می‌خواهد (told me)؛ بدون مفعول say: He said that ...", "said that / told me that", "reported-speech"],
  "neg-modal": ["can / must / should / will خودشان منفی می‌شوند و don't نمی‌خواهند: You mustn't، I can't.", "Modals make their own negative.", "obligation"],
  "so-such": ["قبل از a / an + صفت + اسم such می‌آید نه so: such a nice day (ولی so nice).", "such a + adjective + noun", "too-enough"],
  "too-much": ["قبل از صفت فقط too می‌آید: too hot (too much قبل از اسم می‌آید: too much sugar).", "too + adjective (not too much)", "too-enough"],
  "most-of": ["«بیشترِ مردم» = most people؛ most of فقط قبل از the / my / these ... یا ضمیر می‌آید، و the most of نمی‌آید.", "most people / most of the people", "quantifiers"],
  "few-little": ["a few برای اسم جمع (a few friends) و a little برای غیرقابل‌شمارش (a little money).", "a few + plural, a little + uncountable", "quantifiers"],
  "q-tag": ["دنباله‌ی سؤالی با فعل کمکی و فاعلِ همان جمله ساخته می‌شود؛ جمله‌ی مثبت ← دنباله‌ی منفی و برعکس: You are ..., aren't you?", "Tag: same helper verb and subject, opposite sign.", "question-tags"],
  "phr-sep": ["در فعل‌های دوکلمه‌ای جداشدنی ضمیر (it / them / him ...) وسط می‌آید: turn it off (نه turn off it).", "turn it off, not turn off it", "phrasal-verbs"],
  "reflex": ["وقتی فاعل و مفعول یکی است ‎-self می‌آید (I hurt myself)؛ «تنهایی» = on my own یا by myself؛ «همدیگر» = each other.", "myself, on my own, each other", "reflexive"],
  "ing-after2": ["بعد از consider / deny / keep / imagine / suggest / give up / be worth فعل ‎-ing می‌آید.", "These verbs take -ing.", "gerund-infinitive"],
  "prep-ing": ["بعد از حرف اضافه (without، instead of ...) فعل ‎-ing می‌آید.", "Preposition + -ing", "gerund-infinitive"],
  "to-inf": ["بعد از refuse / agree / promise / decide / manage / afford / pretend فعل با to می‌آید.", "These verbs take to + verb.", "gerund-infinitive"],
  "to-purpose": ["برای گفتن هدف («برای اینکه») to + فعل می‌آید، نه for: I went there to buy bread.", "Purpose: to + verb, not for.", "gerund-infinitive"],
  "third-cond": ["در شرطی نوع سوم بعد از if گذشته‌ی کامل می‌آید (had + شکل سوم)، نه would have و نه have: If I had known, I would have come.", "Third conditional: if + had + past participle.", "third-conditional"],
  "wish": ["بعد از wish برای «کاش» فعل یک قدم به گذشته می‌رود: I wish I had / could / were ...؛ و برای حسرت گذشته had + شکل سوم.", "After wish, go one step back: had, could, were.", "wish"],
  "wish-hope": ["برای آرزوی ممکن در آینده hope می‌آید، نه wish: I hope you will pass.", "Use hope for a possible future.", "wish"],
  "modal-have": ["برای گذشته بعد از should / must / could / might، have + شکل سوم می‌آید: should have told (نه should of یا should had).", "Past modals: should have + past participle.", "past-modals"],
  "pastpc": ["برای کاری که تا لحظه‌ای در گذشته مدتی ادامه داشت، گذشته‌ی کامل استمراری لازم است: I had been waiting for two hours when ...", "Up to a past moment: had been + -ing.", "past-perfect-continuous"],
  "pastpc-ing": ["بعد از had been فعل ‎-ing می‌آید: had been working.", "had been + -ing", "past-perfect-continuous"],
  "fut-cont": ["بعد از will be فعل ‎-ing می‌آید: I will be working.", "will be + -ing", "future-perfect"],
  "fut-perf": ["بعد از will have شکل سوم فعل می‌آید: will have finished.", "will have + past participle", "future-perfect"],
  "causative": ["وقتی کار را کس دیگری برایمان انجام می‌دهد: have / get + چیز + شکل سوم (I had my car repaired).", "have/get something + past participle", "causative"],
  "pass-rep": ["«می‌گویند / گمان می‌رود»: It is said that ...، He is said to be ...، و برای کار گذشته to have + شکل سوم.", "It is said that … / He is said to have done …", "passive-reporting"],
  "rep-verb": ["هر فعل نقل قول الگوی خودش را دارد: suggest that I go، insist on paying، accuse of، apologize for being.", "suggest that…, insist on -ing, accuse of, apologize for -ing", "reporting-verbs"],
  "whose": ["«که ... اش» با whose گفته می‌شود: the man whose car ... (نه who his).", "Possession in a relative clause: whose.", "relative-clauses"],
  "rel-comma": ["در جمله‌ی توضیحی بین دو ویرگول that نمی‌آید؛ برای آدم who و برای چیز which.", "No “that” after a comma: who / which.", "relative-clauses"],
  "all-that": ["بعد از everything / all / something / nothing برای «که» that می‌آید، نه what.", "everything that, all that (not what)", "relative-clauses"],
  "despite": ["despite و in spite of قبل از اسم یا ‎-ing می‌آیند (despite بدون of)؛ قبل از جمله although می‌آید، و به جای because of هم because.", "despite + noun, although + clause", "linkers"],
  "rather": ["بعد از would rather و had better فعل ساده بدون to می‌آید؛ و prefer A to B یا prefer to + فعل.", "would rather / had better + base verb; prefer A to B", "preferences"],
  "inversion": ["وقتی جمله با Never / Rarely / Hardly / Not only / Only then شروع شود، فعل کمکی قبل از فاعل می‌آید (مثل سؤال): Never have I seen ...؛ و no sooner ... than، hardly ... when.", "After a negative opener, invert: Never have I …", "inversion"],
  "cond-will": ["بعد از in case / provided that / as long as برای آینده حال ساده می‌آید، نه will.", "No “will” after in case, provided that, as long as.", "conditionals-advanced"],
  "cleft": ["در جمله‌ی تأکیدی: What I need is ... (بدون it) و It was my father who taught me (بدون he).", "What I need is …; It was X who …", "cleft-sentences"],
  "part-clause": ["بعد از after / before / while فعل ‎-ing می‌آید، و بعد از having شکل سوم: After finishing ...، Having finished ...", "after/before/while + -ing; having + past participle", "participle-clauses"],
  "pass-adv": ["اگر فاعل چیز باشد need to be + شکل سوم (یا need + ‎-ing)؛ در مجهول make با to می‌آید (was made to wait)؛ و being + شکل سوم.", "needs to be done; was made to do; being done", "passive-advanced"],
  "unreal-past": ["بعد از It's time و would rather + کسی فعل گذشته می‌آید، با اینکه منظور الان است: It's time we went.", "It's time we went; I'd rather you didn't.", "unreal-past"],
  "ing-c1": ["can't help / It's no use / no point in + ‎-ing؛ و برای خاطره‌ی گذشته remember / forget + ‎-ing.", "can't help -ing; no use -ing; no point in -ing; remember -ing", "verb-change"],
  "fut-past": ["be about to + فعل ساده؛ on the point of + ‎-ing.", "be about to + verb; on the point of + -ing", "future-in-past"],
  "discourse": ["in addition to / besides + ‎-ing (besides بدون of)، on the other hand، و برای نظر خودت in my opinion (نه according to me).", "in addition to -ing; on the other hand; in my opinion", "discourse-markers"],
  "so-do": ["«من هم» = So + فعل کمکیِ جمله‌ی قبل + فاعل (So am I، So do I)؛ برای منفی Neither do I؛ و I think so / I hope not.", "So am I / So do I / Neither do I; I think so, I hope not", "ellipsis"],
  "subjunctive": ["بعد از It's essential / vital that و suggest / demand / insist that فعل ساده می‌آید، بدون will و بدون ‎-s: It's essential that he be on time، They demanded that he leave.", "It's essential that he be …; demand that he leave", "subjunctive"],
  "mixed-cond": ["شرط در گذشته و نتیجه الان: If I had studied, I would be a doctor now. برای کار گذشته در بخش if، had + شکل سوم می‌آید.", "Past condition, present result: If I had …, I would be … now.", "mixed-conditionals"],
  "inversion2": ["بعد از Not until ... / Only when ... / Only by ... جمله‌ی اصلی جابه‌جا می‌شود (did I notice، can you)؛ و بعد از Not once / In no way / So + صفت هم همین‌طور.", "Not until …, did I …; Only by …, can you …; So tired was I …", "inversion-advanced"],
  "concession": ["بعد از Much as / Try as I might، but نمی‌آید؛ «هرچقدر هم سخت» = how hard (بدون much)؛ و «با اینکه» = even though.", "Much as …, (no but); how hard (not how much hard); even though", "concession"],
  "modal-adv": ["بعد از needn't، dare not، might as well و may well فعل ساده بدون to می‌آید.", "needn't / dare not / might as well / may well + base verb", "modals-advanced"],
  "art-adv": ["اسم کلی و انتزاعی (life، education) بدون the می‌آید؛ و the rich / the poor یعنی «ثروتمندان / فقرا»: بدون ‎-s و با فعل جمع.", "Life is … (no the); the rich are; the poor (no -s)", "articles-advanced"],
  "verb-noprep": ["این فعل حرف اضافه نمی‌خواهد و مفعولش مستقیم می‌آید: emphasize the point، mention it، contact us، resemble him، attend the meeting.", "No preposition: emphasize, mention, contact, resemble, describe, attend, approach", "verbs-no-preposition"],
  "rel-adv": ["بعد از حرف اضافه whom (آدم) یا which (چیز) می‌آید؛ «که هر دوشان» = both of whom؛ و «که این» برای کل جمله = which.", "to whom / in which; both of whom; …, which surprised me", "relative-advanced"],
  "comp-adv": ["«هرچه ...، ...تر»: هر دو بخش با the (The more ..., the more ...)؛ و «دو برابر» = twice as big as.", "The more …, the more …; twice as big as", "comparisons-advanced"],
  "emphasis": ["بعد از do / does / did تأکیدی فعل ساده می‌آید: She does know، I did see.", "Emphatic do/does/did + base verb", "emphasis"],
  "old": ["شکل قدیمی یا محاوره‌ای؛ غلط حساب نمی‌شود، ولی امروزه این‌طور گفته می‌شود.", "Old or dialect form, not an error; today:", ""],
  "pl-subj": ["فاعل جمع است، پس فعل هم جمع می‌آید (are / were / have).", "Plural subject, plural verb.", "present-simple"],
  "colloc": ["این کلمه‌ها در انگلیسی با هم نمی‌آیند (کالوکیشن).", "These words do not go together (collocation).", "collocations"]
};

/* ---------- tokens ---------- */
function tokenize(text) {
  var re = /[A-Za-z]+(?:'[A-Za-z]+)*|\d+(?:[.,:]\d+)*|[^\sA-Za-z\d]/g, m, out = [];
  while ((m = re.exec(text))) {
    var t = m[0];
    var lo = t.toLowerCase();
    out.push({ t: t, l: NO_APOS[lo] ? NO_APOS[lo].toLowerCase() : lo, s: m.index, e: m.index + t.length, w: /^[A-Za-z]/.test(t), d: /^\d/.test(t), ap: NO_APOS[lo] || "" });
  }
  return out;
}
function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function low1(s) { return s === "I" || /^I'/.test(s) || /^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }

function check(text) {
  if (!ready) init({});
  text = String(text || "").replace(/[‘’]/g, "'");
  var T = tokenize(text), n = T.length, edits = [];
  var sStart = [], sEnd = [], st = 0, i, j, k, x, y;
  function stop(i) { return /^[.!?]$/.test(T[i].t) && !(T[i].t === "." && /^(mr|mrs|ms|dr|st|mt|jr|sr|prof)$/i.test(i ? T[i - 1].t : "")); }
  for (i = 0; i < n; i++) { sStart[i] = st; if (stop(i)) st = i + 1; }
  var en = n - 1;
  for (i = n - 1; i >= 0; i--) { if (stop(i)) en = i; sEnd[i] = en; }
  function L(i) { return i >= 0 && i < n ? T[i].l : ""; }
  function isWord(i) { return i >= 0 && i < n && T[i].w; }
  function isQ(i) { var e = sEnd[i]; return e >= 0 && e < n && T[e].t === "?"; }
  function punct(i) { return i >= 0 && i < n && !T[i].w && !T[i].d; }
  function cs(i) { return i === sStart[i] || punct(i - 1) && T[i - 1].t !== "'" || !!CONJ[L(i - 1)]; }
  function capMid(i) { return i !== sStart[i] && /^[A-Z]/.test(T[i].t) && T[i].t !== "I" && !/^I'/.test(T[i].t); }
  function skipAdv(j, max) { var c = 0; while (c < (max || 2) && ADVS[L(j)]) { j++; c++; } return j; }
  function numGt1(i) {
    if (NUMW[L(i)]) return true;
    if (i < n && T[i].d && /^\d+$/.test(T[i].t)) { var v = +T[i].t; return v > 1 && !(T[i].t.length === 4 && v >= 1000 && v <= 2100); }
    return false;
  }
  function boundary(i) { return i >= n || punct(i) || !!CONJ[L(i)] || /^(in|on|at|from|for|with|to|of|now|today|here|there|every|very)$/.test(L(i)); }
  function isBase(x) { return !!V[x] && !MODAL[x] && !BE[x]; }
  function fix(a, b, to, rule, why) {
    var from = text.slice(T[a].s, T[b].e);
    if (/^[A-Z]/.test(from) && a === sStart[a]) to = cap1(to);
    else if (/^[A-Z]/.test(from) && !/^[A-Z]/.test(to) && T[a].t !== "I") to = cap1(to);
    if (to === from) return;
    edits.push({ s: T[a].s, e: T[b].e, from: from, to: to, rule: rule, why: why || "" });
  }
  function ifWish(i) { for (var k = sStart[i]; k < i; k++) if (/^(if|wish|wished|wishes|wishing|though|unless|suppose|lest)$/.test(L(k)) || L(k) === "that" && /^(would|oh|o)$/.test(L(k - 1)) || L(k) === "like" && k === i - 1) return true; return false; }
  function quoted(i) { return /[“”"]/.test(text.slice(T[sStart[i]].s, T[Math.min(sEnd[i], n - 1)].e)); }
  function subjAt(i) { // subject pronoun that starts a clause (the object "it"/"you" are skipped)
    var l = L(i);
    if (L(i - 1) === "-") return false;
    if (l === "he" || l === "she" || l === "i" || l === "we" || l === "they") return !AUXQ[L(i - 1)] || cs(i);
    if (l === "it" || l === "you") return cs(i) && !AUXQ[L(i - 1)];
    return false;
  }
  function askBefore(i) { // "I don't know if / where ...", "Can you tell me what ..."
    var a = L(i - 1), b = L(i - 2);
    return /^(know|knew|known|knows|wonder|wondered|wondering|ask|asked|asks|asking|sure|idea|remember|forgot|forget|understand|explain|see|check|decide|decided|tell|told|whether)$/.test(a) ||
      OBJ[a] && /^(tell|told|ask|asked|show|showed|explain|explained|remind)$/.test(b);
  }
  function unsure(i) { // "I'm not sure if he will come", "I doubt if ...": "if" means "whether" here
    return askBefore(i) || /\b(sure|doubt|doubts|doubted|depends?|dependent|matter|matters|certain|clear|decide|decided|unsure|uncertain|wonder|know|ask|asked|see|check|idea)\b/i.test(text.slice(T[sStart[i]].s, T[i].s));
  }
  function laterWould(i) { // "If ..., I would ..."
    for (var c = i + 3; c <= sEnd[i] && c < n; c++) if (T[c].t === ",")
      for (var m = c + 1; m <= c + 3 && m < n; m++) if (/^(would|could|might)$/.test(L(m)) || /'d$/.test(L(m))) return true;
    return false;
  }
  function perfWould(a, b) { // "... would / could / might have done ..." between a and b
    for (var m = Math.max(a, 0); m <= b && m < n; m++)
      if ((/^(would|could|might|wouldn't|couldn't|mightn't)$/.test(L(m)) || /'d$/.test(L(m))) && L(m + 1) === "have" && (PP[L(m + 2)] || PAST[L(m + 2)] || L(m + 2) === "been" || V[L(m + 2)] && part(L(m + 2)) === L(m + 2))) return true;
    return false;
  }
  function finite(m) { var w = L(m); return /^(am|is|are|was|were|has|have|had|do|does|did|can|could|will|would|should|must|didn't|don't|doesn't|isn't|wasn't|weren't|aren't|can't|couldn't|won't|wouldn't)$/.test(w) || T3[w] && !V[w] && !N[w] || PAST[w] && !V[w]; }
  function presentOf(sb, v) { return v === "be" ? BE3[sb] : SUBJ3[sb] ? third(v) : v; }
  function inv2(p) {
    var v = L(p + 1), sb = T[p].t === "I" ? "I" : L(p);
    if (!T[p + 1] || !T[p + 1].w) return;
    if (/^(have|has|had|am|is|are|was|were|can|could|will|would|should|must|do|does|did|may|might)$/.test(v)) fix(p, p + 1, T[p + 1].t + " " + sb, "inversion2");
    else if (PAST[v] && !V[v]) fix(p, p + 1, "did " + sb + " " + PAST[v], "inversion2");
    else if (T3[v] && !V[v]) fix(p, p + 1, "does " + sb + " " + T3[v], "inversion2");
    else if (isBase(v) && !SUBJ3[L(p)] && !N[v]) fix(p, p + 1, "do " + sb + " " + v, "inversion2");
  }
  function contrSubj(t) { var m = /^(i|you|he|she|it|we|they)'(m|re|s)$/.exec(t); return m ? m[1] : ""; }

  /* spelling-like: split words, capital I, capitals for days / languages / places */
  for (i = 0; i < n; i++) {
    x = L(i);
    if (SPLIT[x]) fix(i, i, SPLIT[x], "split");
    if (T[i].ap) fix(i, i, T[i].ap, "apos");
    if (T[i].w && /^i('m|'ve|'ll|'d)?$/.test(T[i].t) && !(T[i].t === "i" && (T[i - 1] && T[i - 1].e === T[i].s || T[i + 1] && T[i + 1].s === T[i].e && T[i + 1].t !== "'" ||
        /^[A-Z]/.test(T[i - 1] ? T[i - 1].t : "") && /^[A-Z]/.test(T[i + 1] ? T[i + 1].t : "") && i !== sStart[i] + 1 || /[“”"]/.test(text.charAt(T[i].s - 1) + text.charAt(T[i].e))))) fix(i, i, "I" + T[i].t.slice(1), "cap-i");
    else if (T[i].w && CAPS[T[i].t] && !(/^(china|japan)$/.test(x) && !/^(in|to|from|visit|visited|visiting|and|about|across|around)$/.test(L(i - 1))) &&
        !(x === "german" && L(i - 1) === "cousin") && !(x === "french" && /^(fries|fry|toast|kiss|kissing|door|doors|window|windows|press|horn|braid|bread|dressing|beans?|polish|manicure)$/.test(L(i + 1)))) fix(i, i, cap1(T[i].t), "cap");
    if (UNC_PL[x]) fix(i, i, UNC_PL[x], "unc");
    if (WRONG_S[x] && T[i].w && !capMid(i)) fix(i, i, WRONG_S[x], "spell-s");
    if (WRONG_ING[x] && T[i].w && !capMid(i)) fix(i, i, WRONG_ING[x], "spell-ing");
    if (WRONG_ED[x] && T[i].w && !capMid(i)) fix(i, i, WRONG_ED[x], "spell-ed");
    if (BAD_PL[x] && !(x === "persons" || x === "peoples" && (/^(the|of)$/.test(L(i - 1)) || L(i + 1) === "'" || /^P/.test(T[i].t)))) fix(i, i, BAD_PL[x], x === "peoples" || x === "persons" ? "people" : "irr-pl", x === "peoples" ? "note:peoples یعنی «ملت‌ها / اقوام» و به این معنی درست است؛ ولی برای «مردم، آدم‌ها» people (بدون s) می‌گوییم." : "");
    if (WRONG_PAST[x] && L(i - 1) !== "-" && !/^(broadcasted|forecasted)$/.test(x) && !(/^(creeped|payed)$/.test(x) && L(i + 1) === "out" || x === "creeped" && L(i + 2) === "out")) {
      k = i - 1; while (k >= 0 && (ADVS[L(k)] || L(k) === "not")) k--;
      var ppx = HAVE[L(k)] || /^(was|were|is|are|am|be|been|being|get|got|gets)$/.test(L(k)) || /'ve$/.test(L(k));
      fix(i, i, ppx ? part(WRONG_PAST[x]) : past(WRONG_PAST[x]), "irr-past");
    }
    if (WRONG_COMP[x]) fix(i, i, WRONG_COMP[x], x === "gooder" || x === "goodest" || x === "badder" || x === "baddest" ? "more-er" : "long-er");
  }
  var firstW = 0; while (firstW < n && !T[firstW].w) firstW++;
  if (firstW < n && /^[a-z]/.test(T[firstW].t) && T[firstW].t !== "i") fix(firstW, firstW, cap1(T[firstW].ap || T[firstW].t), "cap-start");

  for (i = 0; i < n; i++) {
    x = L(i); y = L(i + 1);

    /* a / an */
    if ((x === "a" || x === "an") && isWord(i + 1) && !(x === "a" && /^A$/.test(T[i].t) && capMid(i)) &&
        !/^(a|and|or|is|are|of|in|on|at|as|if|it|its|into|up|us|lot|few)$/.test(y) && !/^[A-Z]$/.test(T[i + 1].t) && !/^[A-Z]{2,}/.test(T[i + 1].t) && !/^herb/.test(y) && !(T[i + 2] && T[i + 2].s === T[i + 1].e && (T[i + 2].d || y.length === 1 && T[i + 2].t === "-"))) {
      var want = article(T[i + 1].t);
      if (want !== x && !(x === "an" && N2[L(i - 1)] && !OBJ[L(i - 1)] && !V[L(i - 1)] && (i + 2 >= n || punct(i + 2)))) fix(i, i, want, want === "an" ? "an" : "a", x === "an" && /^(h|ewe)/.test(y) ? "note:در انگلیسی قدیم قبل از بعضی کلمه‌های با h (مثل hotel و historic) an می‌آمد؛ امروزه a hotel، a historic." : "");
    }
    /* the my / a my */
    if ((x === "the" || x === "a") && POSS[y] && y !== "her" && isWord(i + 2)) fix(i, i + 1, T[i + 1].t, "the-my");

    /* he/she/it (and my brother, everybody ...) + base verb -> -s */
    var se = -1;
    if ((x === "he" || x === "she") && !AUXQ[L(i - 1)] && !/'(s|ll|d|re|ve)$/.test(L(i - 1)) && L(i + 1) !== "and" && L(i - 1) !== "and" && !/^(dare|need|lest)$/.test(L(i - 1)) && !SUBJUNC.test(L(i - 1)) && !(L(i - 1) === "that" && SUBJUNC.test(text.slice(T[sStart[i]].s, T[i].s)))) se = i;
    else if (x === "it" && (cs(i) || /^(think|know|hope|believe|sure|guess|say|said|says)$/.test(L(i - 1))) && !AUXQ[L(i - 1)]) se = i;
    else if (INDEF[x] && cs(i) && !(L(i - 1) === "that" && SUBJUNC.test(text.slice(T[sStart[i]].s, T[i].s))) && !/^(before|after|than|until|since|like|as)$/.test(L(i - 1)) &&
        !(T[sEnd[i]] && /[!?]/.test(T[sEnd[i]].t) && /^(somebody|someone|everybody|everyone|anybody|anyone|nobody)$/.test(x)) &&
        !(i === sStart[i] && /^(somebody|someone|everybody|everyone)$/.test(x) && /^(say|pay|stay|come|look|listen|help|get|stop|sit|stand|go|wait|call|move|calm|shut|keep|be|hold|take|put|open|leave|grab|clap|raise|line|freeze|relax|hurry|close|turn|bring|fetch|answer|check|tell|find|give)$/.test(L(skipAdv(i + 1))))) se = i;
    else if ((POSS[x] || x === "the") && KIN[y] && cs(i) && !/^(and|or|nor)$/.test(L(i - 1)) && L(i + 2) !== "and") se = i + 1;
    if (se >= 0) {
      j = skipAdv(se + 1);
      k = L(j);
      if (isBase(k) && !SAMEPAST[k] && !PAST[k] && T[j].w && !/^(used|better|let)$/.test(k) && !/ed$/.test(k) && !capMid(j) &&
          !(INDEF[x] && k === "like") && !(/^(need|dare)$/.test(k) && L(j + 1) === "not") && !(/^(sort|kind)$/.test(k) && L(j + 1) === "of") && !/^(fit|knit|quit|wed|spit|rid|bid|wet)$/.test(k) && !(x === "it" && k === "like") && L(j + 1) !== "-" &&
          !(/^(close|live|alone|near|free|clear|open|fine|right|wrong|last|worth|due|able|sure|present|content|clean|dry|empty|warm|cool|calm|quiet|slow|busy|safe|still)$/.test(k) && (j + 1 >= n || punct(j + 1) || /^(to|and|enough|by|from)$/.test(L(j + 1)))) && !(k === "save" && (DET[L(j + 1)] || POSS[L(j + 1)]))) fix(j, j, third(k), "s3");
      if (k === "don't" || k === "do" && L(j + 1) === "not") fix(j, j, k === "do" ? "does" : "doesn't", "do3");
      if ((k === "are" || k === "am") && se === i && j === i + 1 && x !== "it" || (x === "it" && (k === "are" || k === "am") && j === i + 1)) fix(j, j, "is", "be");
      if (k === "were" && se === i && j === i + 1 && SUBJ3[x] && !ifWish(i) && L(i - 1) !== "and") fix(j, j, "was", "was");
    }
    /* I/you/we/they (and people, children) + verb-s */
    var sx = -1;
    if ((x === "i" || x === "we" || x === "they") && !AUXQ[L(i - 1)] && L(i - 1) !== "and") sx = i;
    else if (x === "you" && cs(i) && !AUXQ[L(i - 1)]) sx = i;
    else if (PLSUBJ[x] && !capMid(i) && L(i - 1) !== "and" && (cs(i) || DET[L(i - 1)] && cs(i - 1))) sx = i;
    if (sx >= 0) {
      j = skipAdv(sx + 1); k = L(j);
      if (T3[k] && !V[k] && T[j].w) fix(j, j, T3[k], PLSUBJ[x] ? "pl-subj" : "s3x");
      if (k === "doesn't" || k === "does" && L(j + 1) === "not") fix(j, j, k === "does" ? "do" : "don't", "do3");
      if (j === sx + 1) {
        if (x === "i" && (k === "is" || k === "are")) fix(j, j, "am", "be");
        if (x === "i" && k === "were" && !ifWish(i)) fix(j, j, "was", "was");
        if (x !== "i" && (k === "is" || k === "am")) fix(j, j, "are", PLSUBJ[x] ? "pl-subj" : "be");
        if (x !== "i" && k === "was") fix(j, j, "were", PLSUBJ[x] ? "pl-subj" : "was");
        if (PLSUBJ[x] && k === "has") fix(j, j, "have", "pl-subj");
      }
    }
    /* my parents is -> are */
    if ((POSS[x] || x === "the" || x === "these" || x === "those") && PL[y] && !T3[y] && cs(i) && L(i - 1) !== "and" && !/^(before|after|since|until|till|than|like|as|for|so)$/.test(L(i - 1)) && !/^(of|about|with|in|on|at|for|from|to|by|among|between|like|than|as)$/.test(L(i - 1)) && !ING[L(i - 1)] && !/ing$/.test(L(i - 1)) && isWord(i + 1) && !capMid(i + 1)) {
      k = L(i + 2);
      if (k === "is") fix(i + 2, i + 2, "are", "pl-subj");
      else if (k === "was") fix(i + 2, i + 2, "were", "pl-subj");
      else if (k === "has") fix(i + 2, i + 2, "have", "pl-subj");
    }
    /* Is they / Are he (question) */
    if (/^(is|are|am|was|were)$/.test(x) && (i === sStart[i] || WH[L(i - 1)]) && SUBJ[y] && isQ(i)) {
      var bw = y === "i" ? (/^(was|were)$/.test(x) ? "was" : "am") : SUBJ3[y] ? (/^(was|were)$/.test(x) ? "was" : "is") : (/^(was|were)$/.test(x) ? "were" : "are");
      if (bw !== x) fix(i, i, bw, /^(was|were)$/.test(x) ? "was" : "be");
    }
    /* do he / does they (questions) */
    if ((x === "do" || x === "don't") && (y === "he" || y === "she")) fix(i, i, x === "do" ? "does" : "doesn't", "do3");
    if ((x === "does" || x === "doesn't") && SUBJX[y]) fix(i, i, x === "does" ? "do" : "don't", "do3");

    /* there is / there are */
    if ((x === "there" && /^(is|was|are|were)$/.test(y) || x === "there's") && !(x === "there" && (N[L(i - 1)] || PL[L(i - 1)]) && !cs(i)) && !(L(i + 2) === "much" && (L(i + 3) === "more" || COMP_OF[L(i + 3)]))) {
      var bi = x === "there's" ? i : i + 1, bl = x === "there's" ? "is" : y;
      j = bi + 1; k = L(j);
      if (/^(is|was)$/.test(bl)) {
        var plu = (numGt1(j) || /^(many|several)$/.test(k) && !(k === "many" && (UNC_STRICT[L(j + 1)] || UNC_SOFT[L(j + 1)]) && L(j + 1) !== "time" && !PL[L(j + 2)] && !unknownPl(L(j + 2))) || k === "lots" && !(L(j + 1) === "of" && (UNC_STRICT[L(j + 2)] || UNC_SOFT[L(j + 2)] || /ing$/.test(L(j + 2)) || !PL[L(j + 2)] && !numGt1(j + 2)))) && !/^(pounds|dollars|shillings|euros|rials|tomans|yen|cents|pence|francs|marks)$/.test(L(j + 1)) && !(NUMW[L(j + 1)] && /^(pounds|dollars|shillings|euros)$/.test(L(j + 2)));
        if (!plu && !/^(lots|loads|plenty|tons)$/.test(k)) { var jj = j; if (A[L(jj)] && !N[L(jj)]) jj++; plu = !!PL[L(jj)] && !T3[L(jj)] || PLSUBJ[L(jj)] === 1 && L(jj) !== "police"; }
        if (plu) fix(bi, bi, x === "there's" ? "there are" : bl === "was" ? "were" : "are", "there", x === "there's" ? "note:در حرف زدن there's با جمع هم زیاد شنیده می‌شود (There's lots of …)، ولی در نوشتن there are درست است." : "");
      } else if ((k === "a" || k === "an" || k === "one" || k === "much") &&
        !/^(lot|few|couple|number|great|variety|total|dozen|hundred|thousand|million|billion|bunch|pair|series|range|myriad|or|good|ton|tons|multitude|host|fair|handful|load|whole|large|small|huge|wide)$/.test(L(j + 1)) &&
        !(bl === "were" && ifWish(i)) && !/^(as|than)$/.test(L(i - 1)) && !/^(crowd|maximum|minimum|infinite|increasing|growing|large|fucking|huge|number|lot|total|group)$/.test(L(j + 1)) && !/^(number|lot|crowd)$/.test(L(j + 2)) && !/\band\b/i.test(text.slice(T[j].e, T[sEnd[i]] ? T[sEnd[i]].s : text.length).split(/[,;:]| (?:who|that|which|in|on|at|of) /)[0])) {
        fix(bi, bi, bl === "were" ? "was" : "is", "there");
      }
    }
    if (x === "their" && /^(is|are|was|were)$/.test(y)) fix(i, i, "there", "there2");
    if (x === "there" && /^(car|house|children|friends|parents|names|home|own|family|kids|books|money|father|mother|son|daughter|teacher)$/.test(y) && !/^(is|are|was|were|go|went|live|lived|get|got|over)$/.test(L(i - 1))) fix(i, i, "their", "their");

    /* after do / does / did: base verb */
    var dj = -1;
    if (DO_NEG[x]) dj = i + 1;
    else if (/^(do|does|did)$/.test(x) && y === "not") dj = i + 2;
    else if (/^(do|does|did)$/.test(x) && (i === sStart[i] || WH[L(i - 1)] || /^(how|what)$/.test(L(i - 2)))) {
      if (SUBJ[y]) dj = i + 2;
      else if ((POSS[y] || y === "the") && isWord(i + 2) && (N[L(i + 2)] || PL[L(i + 2)] || KIN[L(i + 2)])) dj = i + 3;
    }
    if (dj >= 0) {
      j = skipAdv(dj); k = L(j);
      if (T[j] && T[j].w && !V[k] && !capMid(j)) {
        var b0 = T3[k] || PAST[k] || PP[k] || WRONG_PAST[k];
        if (b0 && !(k === "fell" && (DET[L(j + 1)] || OBJ[L(j + 1)]))) fix(j, j, b0, "base-do");
      }
    }

    /* modals */
    if (MODAL[x] && !DET[L(i - 1)] && !/^(free|own|good|last|-)$/.test(L(i - 1)) && !(capMid(i) && /^(may|will|can)$/.test(x)) &&
        !(x === "will" && (/'s$/.test(L(i - 1)) || POSS[L(i - 1)] || A[L(i - 1)] || /^(of|s)$/.test(L(i - 1)))) && !((i === sStart[i] || punct(i - 1)) && /^(May|Might|Will)$/.test(T[i].t) && !isQ(i)) &&
        !(x === "can" && (N2[L(i - 1)] || A[L(i - 1)]) && !SUBJ[L(i - 1)] && !PERSON[L(i - 1)] && !KIN[L(i - 1)]) &&
        !(x === "can" && (/ing$/.test(L(i - 1)) || T3[L(i + 1)] && !PL[L(i - 1)] && !SUBJ[L(i - 1)] && !/s$/.test(L(i - 1)))) && !(L(i + 1) === "saw" && !OBJ[L(i + 2)] && !POSS[L(i + 2)] && !DET[L(i + 2)] || L(i + 1) === "saw" && numGt1(i + 2)) && !(SUBJ[L(i - 1)] && L(i - 2) === "as") &&
        !(i === sStart[i] && isQ(i) && PL[L(i + 1)]) && !(L(i + 1) === "fell" && (DET[L(i + 2)] || OBJ[L(i + 2)]))) {
      j = i + 1; if (L(j) === "not") j++; j = skipAdv(j); k = L(j);
      var mq = i - 1; while (mq > 0 && ADVS[L(mq)]) mq--;
      if (k === "to" && T[j] && !(SUBJ[L(mq)] && /^(everything|anything|something|all|what|whatever|as|much|best|that|which)$/.test(L(mq - 1))) && !(x === "will" && /^(to|like|free|own|the|a|good|ill)$/.test(L(i - 1)))) fix(i, j, text.slice(T[i].s, T[j - 1].e), "modal-to");
      else if (T[j] && T[j].w && !V[k]) {
        var b1 = /^(is|are|am|was|were)$/.test(k) ? "be" : T3[k] || PAST[k] || (k !== "being" && !isQ(i) && ING[k]) || "";
        if (b1 && !capMid(j)) fix(j, j, b1, k === "had" && (PP[L(j + 1)] || PAST[L(j + 1)]) ? (/^(will|won't)$/.test(x) ? "fut-perf" : "modal-have") : "modal-base");
      }
    }

    /* I'll taking -> I'll take; Let's going -> Let's go */
    if (/^[a-z]+'ll$/.test(x) || x === "let's") {
      j = i + 1; if (L(j) === "not" && x !== "let's") j++; j = skipAdv(j); k = L(j);
      if (T[j] && T[j].w && !V[k] && !capMid(j)) {
        var b2 = x === "let's" ? ING[k] || "" : /^(is|are|am|was|were)$/.test(k) ? "be" : T3[k] || PAST[k] || ING[k] || "";
        if (b2 && k !== "being" && !/^(fucking|freaking|bloody|damn|frigging)$/.test(k) && !(k === "found" && (DET[L(j + 1)] || POSS[L(j + 1)]))) fix(j, j, b2, x === "let's" ? "lets-base" : "modal-base");
      }
    }

    /* plural after numbers, many, these ... */
    if ((QTY[x] || numGt1(i)) && !(x === "few" && L(i - 1) !== "a" && L(i - 1) !== "very" && L(i - 1) !== "quite" && !cs(i)) &&
        !(T[i].d && /^(at|by|until|till|before|after|around|about)$/.test(L(i - 1))) && !/^(last|next)$/.test(y) && !(x === "both" && (BE[L(i - 1)] || AUXQ[L(i - 1)]))) {
      j = i + 1; var na = 0;
      while (na < 2 && A[L(j)] && !N[L(j)] && T[j] && T[j].w) { j++; na++; }
      k = L(j);
      if (T[j] && T[j].w && N[k] && !PL[k] && !/[^s]s$/.test(k) && !UNC_STRICT[k] && !UNC_SOFT[k] && !NUMW[k] && !A[k] && !capMid(j) &&
          !/^(reindeer|sheep|deer|fish|jellyfish|goldfish|aspirin|island|view|noon|midnight|personnel|lot|north|south|east|west|ball|data|media|criteria|phenomena|bacteria|point|comma|underwear|clothing|headquarters|means|cattle|kanji|aircraft|series|species|offspring|moose|bison|salmon|trout|swine|brethren|police|people|foot|past|pair|head|stone|dozen|score|hundred|thousand|million|billion|percent|yen|yuan|baht|rupee|folk|crew|staff)$/.test(k) &&
          !MONTHS[k] && !DAYS[k] && !OBJ[L(j + 1)] && !DET[L(j + 1)] && !POSS[L(j + 1)] && !(A2[k] && !N[L(j + 1)] && (x === "these" || x === "those")) && !((x === "these" || x === "those") && (PAST[k] || ING[k] || /^(present|concerned|involved|affected|interested)$/.test(k))) &&
          !/^(a|an|number|no|page|chapter|part|room|size|line|flight|bus|level|grade|platform|gate|model|version|episode|season|act|scene|verse|article|section|step|figure|exercise|question|unit|lesson|track|channel|route|highway|apollo)$/.test(L(i - 1)) &&
          !(T[i].d && T[i - 1] && T[i - 1].w && T[i - 1].e === T[i].s) && !(x === "both" && !cs(i)) && !(x === "few" && V[k] && !N[L(j + 1)]) && !(T[i - 1] && /^[$€£¥#]$/.test(T[i - 1].t)) &&
          !/^(category|type|class|stage|phase|tier|division|league|round|day|week|year|world|war|term|block|zone|sector|floor|apartment|flat|suite|ward|bed)$/.test(L(i - 1)) &&
          !(A2[L(j + 1)] && (N2[L(j + 2)] || PL[L(j + 2)])) &&
          L(j + 2) !== "-" && !ING[k] && !/ing$/.test(k) && !(T[i - 1] && T[i - 1].t === "/") && !NUMW[L(i - 1)] && L(i - 1) !== "one" && !(T[i - 1] && T[i - 1].d) && !(T[i].d && i > 0 && capMid(i - 1)) && !(T[i].d && L(i - 1) === "the") && !(PP[L(j + 1)] || /ed$/.test(L(j + 1)) && !PAST[L(j + 1)]) && !(x === "eight" && k === "ball") && !N2[L(j + 1)] &&
          !((PL[L(j + 1)] || /s$/.test(L(j + 1)) && (N2[L(j + 1).replace(/s$/, "")] || N2[L(j + 1).replace(/ies$/, "y")])) && !KIN[k] && !PERSON[k] && !JOB[k] && (j + 2 >= n || punct(j + 2) || finite(j + 2) || ING[L(j + 2)] || /ing$/.test(L(j + 2)) || V[L(j + 2)] || PAST[L(j + 2)] || MODAL[L(j + 2)] || /^(in|on|at|of|for|with|to|from|by|piled|and|or)$/.test(L(j + 2)))) && !(T[j + 1] && T[j + 1].t === "," && numGt1(j + 2)) &&
          !(V[k] && (QTY[x] && x !== "many" && x !== "several")) && k.length > 2 &&
          !N[L(j + 1)] && !(PL[L(j + 1)] && !((KIN[k] || PERSON[k] || JOB[k]) && T3[L(j + 1)])) && !QTY[L(j + 1)] && L(j + 1) !== "old" && L(j + 1) !== "and" && !(/^(foot|mile|meter|metre|year|pound|dollar|hour|minute|score|inch)$/.test(k) && isWord(j + 1)) && !(/s$/.test(L(j + 1)) && L(j + 1).length > 3 && !AUXQ[L(j + 1)] && !T3[L(j + 1)]) &&
          L(i - 1) !== "-" && L(i + 1) !== "-" && L(j + 1) !== "-" && !/^'/.test(L(j + 1)) &&
          !(T[i].d && L(j + 1) === "-")) {
        fix(j, j, plural(k), "pl");
      }
    }
    /* singular after a / an / one / each / every / this */
    if (/^(a|an|one|each|every|this)$/.test(x) && !(x === "one" && (/^(no|any|every|some|which|the|this|that|each|more|less)$/.test(L(i - 1)) || cs(i))) &&
        !(x === "a" && /^(third|quarter|half)$/.test(y)) && !(x === "each" && y === "other")) {
      j = i + 1; var na2 = 0;
      while (na2 < 2 && A[L(j)] && !/^(few|little|lot|couple|number|great|dozen|hundred|thousand|million|pair|variety|bunch|group|kind)$/.test(L(j)) && T[j] && T[j].w) { j++; na2++; }
      k = L(j);
      if (T[j] && T[j].w && PL[k] && !N[k] && !NOPL[k] && !(x !== "every" && x !== "a" && x !== "an" && T3[k]) && !capMid(j) &&
          L(j + 1) !== "'" && L(j + 1) !== "-" && !(N[L(j + 1)] && !T3[L(j + 1)]) && !N2[L(j + 1)] && !JOB[L(j + 1)] && !(A2[L(j + 1)] && !/ly$/.test(L(j + 1))) &&
          !/^(up|to)$/.test(L(j + 1)) && !(k === "ways" && L(j - 1) === "long") && !(/^(sales|sports|systems|savings|arts|goods|awards|arms|customs|earnings|operations|communications|electronics|graphics|human|jeans|glasses)$/.test(k) && isWord(j + 1))) {
        if (x === "this") { if ((finite(j + 1) || MODAL[L(j + 1)] || /^(of|in|on|at|for|with|from)$/.test(L(j + 1))) && L(j + 1) !== "ago" && !V[k.replace(/e?s$/, "")] && !V[k.replace(/s$/, "")] || /^(are|were|have)$/.test(L(j + 1))) fix(i, i, "these", "this"); }
        else fix(j, j, PL[k], "sg");
      }
    }
    /* one of my friend -> friends */
    if (x === "one" && y === "of" && DET[L(i + 2)] && !/^(a|an)$/.test(L(i + 2)) && !/^(part|chapter|number|page|day|episode|book|volume|act|season|lesson|unit|level|stage|phase|round|week|year|no)$/.test(L(i - 1))) {
      j = i + 2; if (DET[L(j)]) j++;
      while ((A[L(j)] || /(est)$/.test(L(j)) || L(j) === "most") && !N[L(j)] && T[j] && T[j].w) j++;
      k = L(j);
      if (T[j] && T[j].w && N[k] && !PL[k] && !UNC_STRICT[k] && !UNC_SOFT[k] && !NOPL[k] && !/ing$/.test(k) && !/^(number|family|youth|staff|team|class|crew|group|public|population|kind|sort|top|present|flesh|jury|board|committee|audience|police|government|company|bunch|lot|principal)$/.test(k) && !COMP_OF[k] && !capMid(j + 1) &&
          !(isWord(j + 1) && /s$/.test(L(j + 1)) && L(j + 1).length > 3 && !KIN[k] && !PERSON[k] && !JOB[k] && !AUXQ[L(j + 1)]) && !(A2[k] && (N2[L(j + 1)] || PL[L(j + 1)])) && L(j + 1) !== "-" && !((N[L(j + 1)] || PL[L(j + 1)]) && !T3[L(j + 1)] && !AUXQ[L(j + 1)]) && !(isWord(j + 1) && /s$/.test(L(j + 1)) && (A[k] || UNC_SOFT[L(j + 1).slice(0, -1)] || UNC_STRICT[L(j + 1).slice(0, -1)])) && !capMid(j)) fix(j, j, plural(k), "one-of");
    }
    /* a / an + uncountable */
    if (((x === "a" || x === "an") && UNC_STRICT[y] && y !== "news" || (x === "a" && y === "news")) && !/^(of|-)$/.test(L(i + 2)) && (i + 2 >= n || punct(i + 2) || boundary(i + 2) || finite(i + 2) || MODAL[L(i + 2)] || /^(about|for|to|from|on|with|of|that|which|who)$/.test(L(i + 2))) && !N2[L(i + 2)] && !PL[L(i + 2)] && !JOB[L(i + 2)] && !(A[L(i + 2)] && (N2[L(i + 3)] || PL[L(i + 3)]))) fix(i, i + 1, T[i + 1].t, "unc");
    /* much / many */
    if (x === "many" && (UNC_STRICT[y] || UNC_SOFT[y] || UNC_PL[y]) && y !== "time" && L(i + 2) !== "-" && !((PL[L(i + 2)] || unknownPl(L(i + 2))) && !UNC_PL[y])) fix(i, i, "much", "much"); // "many tea plantations": tea only describes a plural noun
    if (x === "much" && isWord(i + 1) && (PL[y] && !T3[y] && !N[y] || PLSUBJ[y] && y !== "police") && !(/^(how|matter)$/.test(L(i - 1)) && !(AUXQ[L(i + 2)] && (SUBJ[L(i + 3)] || DET[L(i + 3)] || OBJ[L(i + 3)])) && !(i + 2 >= n || punct(i + 2))))
      fix(i, i, "many", "much");

    /* have/has + past -> participle; have + base -> participle */
    if (HAVE[x] || /'ve$/.test(x) || x === "'d") {
      j = i + 1; if (SUBJ[L(j)] && (i === sStart[i] || WH[L(i - 1)])) j++;
      if (L(j) === "not") j++; j = skipAdv(j); k = L(j);
      var bb = PAST[k], mh = x === "have" && (MODAL[L(i - 1)] || L(i - 1) === "not" && MODAL[L(i - 2)] || /'ll$/.test(L(i - 1)));
      var ppR = !mh ? "pp" : /^(will|won't|shall)$/.test(L(i - 1)) || /'ll$/.test(L(i - 1)) || L(i - 1) === "not" && L(i - 2) === "will" ? "fut-perf" : "modal-have";
      if (T[j] && T[j].w && L(j + 1) !== "-" && bb && IRR[bb] && IRR[bb][0] !== IRR[bb][1] && k === IRR[bb][0] && k !== "got" && k !== "lay" && !PP_OK[k] && !V[k]) fix(j, j, IRR[bb][1], ppR);
      else if (T[j] && T[j].w && HAVE_BASE[k] && L(j + 1) !== "to" && part(k) !== k && L(i) !== "'d") fix(j, j, part(k), ppR);
      else if (mh && j === i + 1 && T[j] && T[j].w && L(j + 1) !== "-" && isBase(k) && part(k) !== k && !N[k] && !A[k] && !UNC_SOFT[k] && !UNC_STRICT[k] && L(j + 1) !== "to" &&
        !/^(like|love|let|used|better|mean|lie|lay)$/.test(k) && (boundary(j + 1) || DET[L(j + 1)] || OBJ[L(j + 1)] || /^(it|something|anything|everything|by|before)$/.test(L(j + 1)))) fix(j, j, part(k), ppR);
    }

    /* comparatives */
    if ((x === "more" || x === "most") && isWord(i + 1)) {
      if (x === "more" && (COMP_OF[y] || y === "better" || y === "worse")) fix(i, i + 1, T[i + 1].t, "more-er");
      else if (x === "most" && (SUP_OF[y] || y === "best" || y === "worst")) fix(i, i + 1, T[i + 1].t, "more-er");
      else if (x === "more" && SHORT_A[y] && L(i + 2) === "than" && !(A[L(i + 3)] || A2[L(i + 3)]) && L(i - 1) !== "no") fix(i, i + 1, comp(y, 0), "short-er");
      else if (x === "most" && SHORT_A[y] && L(i - 1) === "the" && L(i + 2) !== "and" && L(i + 2) !== "-" && L(i + 2) !== "of" && !(y === "heavy" && L(i + 2) === "metal")) fix(i, i + 1, comp(y, 1), "short-er");
    }
    if (x === "then" && isWord(i + 1) && (COMP_OF[L(i - 1)] || /^(better|worse|less|more)$/.test(L(i - 1)) || L(i - 2) === "more" && A[L(i - 1)]) &&
        (SUBJ[y] || OBJ[y] || DET[y] || /^[A-Z]/.test(T[i + 1].t) || numGt1(i + 1) || y === "before" || y === "ever")) fix(i, i, "than", "than");
    if (x === "as" && (A[y] || /^(much|many|fast|well|soon|often)$/.test(y)) && L(i + 2) === "than" && L(i - 1) !== "such") fix(i + 2, i + 2, "as", "as-as");
    if (x === "same" && (y === "than" || y === "like") && L(i - 1) === "the") fix(i + 1, i + 1, "as", "same-as");

    /* questions */
    if (WH[x] && i === sStart[i] && isQ(i) && !quoted(i) && !(L(i + 1) === "the" && /^(hell|devil|heck|dickens|deuce)$/.test(L(i + 2))) && !(L(i + 1) === "on" && L(i + 2) === "earth") &&
        !(/^(when|where|while|if)$/.test(x) && /,/.test(text.slice(T[i].e, T[sEnd[i]] ? T[sEnd[i]].s : text.length))) &&
        !/\b(for|at|to|about|of|do|mean|meant|want|wanted|need|needed|say|said|like|see|saw|know|knew)\s+(is|was|are|were)\b/i.test(text.slice(T[i].e, T[sEnd[i]] ? T[sEnd[i]].s : text.length))) {
      j = i + 1;
      if (x === "how" && /^(old|much|many|long|far|often|big|tall)$/.test(y)) { j++; if (N[L(j)] || PL[L(j)] || UNC_SOFT[L(j)] || PLSUBJ[L(j)]) j++; }
      else if ((x === "what" || x === "which") && /^(time|kind|colou?r|day|size|sport|food|music)$/.test(y)) j++;
      var s0 = j, s1 = -1, plS = false, s3S = false;
      if (SUBJ[L(j)] || /^(i|you|he|she|it|we|they)'(m|re|s)$/.test(L(j))) { s1 = j; plS = !!SUBJX[L(j)]; s3S = !!SUBJ3[L(j)]; }
      else if (POSS[L(j)] || L(j) === "the") { if (N[L(j + 1)] || KIN[L(j + 1)] || L(j + 1) === "name") { s1 = j + 1; s3S = true; } else if (PL[L(j + 1)] || PLSUBJ[L(j + 1)]) { s1 = j + 1; plS = true; } }
      if (s1 >= 0) {
        var cs2 = contrSubj(L(s1));
        k = L(s1 + 1);
        var subjTxt = text.slice(T[s0].s, T[s1].e);
        if (cs2) {
          var aux = { m: "am", re: "are", s: "is" }[L(s1).split("'")[1]];
          fix(s0, s1, aux + " " + low1(T[s1].t.split("'")[0]), "q-order");
        } else if (AUXQ[k] && !(x === "who" && s0 === i + 1 && false)) {
          fix(s0, s1 + 1, T[s1 + 1].t.toLowerCase() + " " + low1(subjTxt), "q-order");
        } else {
          var jj2 = skipAdv(s1 + 1), kk = L(jj2), vb = "", dd = "";
          if (isBase(kk) && !SAMEPAST[kk]) { vb = kk; dd = s3S && L(s1) !== "i" ? "does" : "do"; }
          else if (T3[kk] && !V[kk]) { vb = T3[kk]; dd = "does"; }
          else if (PAST[kk] && !V[kk]) { vb = PAST[kk]; dd = "did"; }
          if (vb && !(L(s1) === "i" && dd === "does")) fix(s0, jj2, dd + " " + low1(subjTxt) + (jj2 > s1 + 1 ? " " + text.slice(T[s1 + 1].s, T[jj2 - 1].e) : "") + " " + vb, "q-do");
        }
      }
    }
    if (/^(do|does|did)$/.test(x) && i === sStart[i] && SUBJ[y] && /^(can|could|should|must|will|would)$/.test(L(i + 2))) {
      fix(i, i + 2, T[i + 2].t.toLowerCase() + " " + low1(T[i + 1].t), "q-modal");
    }
    if (/^(am|is|are|was|were)$/.test(x) && i === sStart[i] && SUBJ[y] && isQ(i)) {
      j = i + 2; var nt = L(j) === "not"; if (nt) j++;
      k = L(j);
      if (BE_V[k] && !ING[k]) {
        var pd = /^(was|were)$/.test(x) ? "did" : SUBJ3[y] ? "does" : "do";
        fix(i, j, pd + (nt ? "n't" : "") + " " + low1(T[i + 1].t) + " " + k, "q-be-do");
      }
    }

    /* I am agree -> I agree; I going -> I am going; I happy -> I am happy */
    var sp = "", bIdx = -1, bForm = "";
    if (subjAt(i) && /^(am|is|are|was|were)$/.test(y)) { sp = x; bIdx = i + 1; bForm = y; }
    else if (contrSubj(x) && (cs(i) || i === sStart[i])) { sp = contrSubj(x); bIdx = i; bForm = { m: "am", re: "are", s: "is" }[x.split("'")[1]]; }
    if (sp && !(bIdx === i && sp === "he" && false)) {
      j = bIdx + 1; var neg = L(j) === "not"; if (neg) j++;
      if (x.indexOf("'") < 0 && /n't$/.test(y)) neg = true;
      k = L(j);
      var isPast = bForm === "was" || bForm === "were";
      if (BE_V[k] && T[j] && T[j].w && !(sp === "it" && k !== "seem" && k !== "mean") && !(k === "like" && !(L(j + 1) === "to" && isBase(L(j + 2)) || ING[L(j + 1)] && L(j + 1) !== "being" || L(j + 1) === "very")) && !(bIdx === i && IRR[k] && IRR[k][1] === k) &&
          !capMid(j) && !(k === "mean" && !/^(that|it|this|what|you|him|her|them)$/.test(L(j + 1))) && !(part(k) === k && (isPast || /^(over|down|out|up|off|by|in|into|away|through|as|with|at|on|to|for|aloud)$/.test(L(j + 1)))) && !(JOB[k] && /^(in|at|on|for|with|to|and)$/.test(L(j + 1))) &&
          !(/^(come|become)$/.test(k) && !/^(from|back|home|here|there|every|in|to)$/.test(L(j + 1))) &&
          !(A2[k] && !/^(agree|like|want|need|know|think|love|hate|live|work)$/.test(k) && (j + 1 >= n || punct(j + 1) || /^(to|and|but|with|about|at|for|enough)$/.test(L(j + 1))))) {
        var vv = neg ? (isPast ? "didn't " : SUBJ3[sp] ? "doesn't " : "don't ") + k : isPast ? past(k) : SUBJ3[sp] ? third(k) : k;
        var subjOut = bIdx === i ? T[i].t.split("'")[0] : T[i].t;
        var withIng = text.slice(T[bIdx].s, T[j].s) + ing(k);
        if (!STATIVE[k] && (isPast ? /\b(when|while|all day|all night|at \d)/i : /\b(now|at the moment|look|listen)\b/i).test(text.slice(T[sStart[i]].s, T[sEnd[i]] ? T[sEnd[i]].e : text.length)))
          fix(bIdx, j, withIng, "be-ing", "alt:" + subjOut + " " + vv);
        else fix(i, j, subjOut + " " + vv, "be-verb", STATIVE[k] ? "" : "alt:" + subjOut + " " + (bForm) + " " + ing(k));
      }
    }
    if (subjAt(i) && cs(i) && isWord(i + 1) && L(i - 1) !== "and" && !isQ(i) && !(x === "you" && (T[sEnd[i]] && T[sEnd[i]].t === "!" || T[i + 2] && T[i + 2].t === ","))) {
      j = i + 1; k = L(j);
      var bNow = BE3[x];
      if (ING[k] && k !== "being" && !N[k] && !capMid(j) && !/^(fucking|freaking|bloody|damn|frigging)$/.test(k) && !finite(j + 1) && !(k === "having" && (PP[L(j + 1)] || /ed$/.test(L(j + 1)))) && !(x === "you" && (N2[L(j + 1)] || PL[L(j + 1)]) && (j + 2 >= n || punct(j + 2)))) fix(i, j, T[i].t + " " + bNow + " " + T[j].t, "be-ing");
      else if (/^(worried|tired|kind|ill)$/.test(k) && /^(of|that|about|-)$/.test(L(j + 1))) { /* "He worried that ...", "I kind of", "I tired of it" */ }
      else if ((ADJ_BE[k] || /^(very|so|really|too)$/.test(k) && ADJ_BE[L(j + 1)]) && (boundary(j + 1 + (ADJ_BE[k] ? 0 : 1)) || L(j + 1 + (ADJ_BE[k] ? 0 : 1)) === "and"))
        fix(i, j, T[i].t + " " + bNow + " " + T[j].t, "be-adj");
      else if (k === "very" && /^(like|love|enjoy|want|need|hate|agree)$/.test(L(j + 1))) fix(j, j, "really", "very-like");
    }

    /* He is teacher -> a teacher; I have car -> a car */
    if (/^(is|am|was|be|become|becomes|became|'s|'m)$/.test(x) || /'(s|m)$/.test(x) && contrSubj(x)) {
      j = i + 1; while (A[L(j)] && !JOB[L(j)] && T[j] && T[j].w) j++;
      if (JOB[L(j)] && T[j] && !capMid(j) && !/^[A-Z]/.test(T[j + 1] ? T[j + 1].t : "") && !PL[L(j + 1)] && !N[L(j + 1)] && L(j + 1) !== "'s") {
        var fw = T[i + 1].t; fix(i + 1, i + 1, article(fw) + " " + fw, "a-job");
      }
    }
    if (/^(have|has|had)$/.test(x) && (SUBJ[L(i - 1)] || /^(to|don't|doesn't|didn't|not)$/.test(L(i - 1)) || KIN[L(i - 1)]) && HAVE_A[y] && !/^(toothache|stomachache|backache|earache)$/.test(y) && !capMid(i + 1) &&
        !N[L(i + 2)] && !PL[L(i + 2)] && L(i + 2) !== "'s") {
      fix(i + 1, i + 1, article(T[i + 1].t) + " " + T[i + 1].t, "a-need");
    }

    /* age */
    if (/^(have|has|had)$/.test(x) && numGt1(i + 1) === true || /^(have|has|had)$/.test(x) && T[i + 1] && T[i + 1].d) {
      if (/^years?$/.test(L(i + 2)) && (L(i + 3) === "old" || i + 3 >= n || punct(i + 3))) {
        var ss = L(i - 1), bf = x === "had" ? (BEPAST[ss] || "was") : (BE3[ss] || (x === "has" ? "is" : "are"));
        fix(i, i, bf, "age");
      }
    }
    if (/^(am|is|are|'m)$/.test(x) || /'m$/.test(x)) {
      if (T[i + 1] && (T[i + 1].d || NUMW[y]) && /^years?$/.test(L(i + 2)) && (i + 3 >= n || punct(i + 3)) ) fix(i + 2, i + 2, T[i + 2].t + " old", "age-old");
    }

    /* prepositions of time */
    if ((x === "in" || x === "at") && DAYS[y] && !(x === "at" && (N[L(i + 2)] || PL[L(i + 2)]) && !/^(morning|afternoon|evening|night)$/.test(L(i + 2))) &&
        !(L(i + 2) === "-" || /^(school|schools|clothes|best|paper|papers|dinner|lunch|service|services|market|edition|times)$/.test(L(i + 2))) && !/^(hand|turn|send|put|come|handed|turned|sent)$/.test(L(i - 1))) fix(i, i, "on", "on-day");
    if ((x === "on" || x === "at") && MONTHS[y] && !(/^(may|march)$/.test(y) && !/^[A-Z]/.test(T[i + 1].t)) && !(T[i + 2] && T[i + 2].d) && !/^\d/.test(L(i + 2)) && !NUMW[L(i + 2)] && !/(st|nd|rd|th)$/.test(L(i + 2)) && !/^(the|fool|fools)$/.test(L(i + 2)) && !(T[i + 2] && T[i + 2].t === "," && T[i + 3] && T[i + 3].d)) fix(i, i, "in", "in-month");
    if ((x === "on" || x === "at") && T[i + 1] && T[i + 1].d && /^(19|20)\d\d$/.test(T[i + 1].t)) fix(i, i, "in", "in-month");
    if ((x === "in" || x === "on") && (T[i + 1] && T[i + 1].d && (/:/.test(T[i + 1].t) || /^(o'clock|am|pm|a\.m|p\.m)$/.test(L(i + 2))) || /^(noon|midnight)$/.test(y))) fix(i, i, "at", "at-time");
    if (x === "in" && y === "night") fix(i, i, "at", "at-time");
    if (x === "at" && y === "the" && /^(morning|afternoon|evening)$/.test(L(i + 2))) fix(i, i, "in", "in-the-m");
    if ((x === "at" || x === "in") && /^(morning|afternoon|evening)$/.test(y) && !N[L(i + 2)] && !PL[L(i + 2)]) fix(i, i + 1, "in the " + T[i + 1].t, "in-the-m");
    if (/^(in|on|at)$/.test(x) && /^(next|last|this|every)$/.test(y) && TIMEN[L(i + 2)] && !(x === "at" && y === "this") &&
        !(x === "at" && (V[L(i - 1)] || PAST[L(i - 1)] || ING[L(i - 1)] || BE[L(i - 1)] || y === "last" && cs(i))) && !(x === "on" && (BE[L(i - 1)] || /'s$/.test(L(i - 1)))) &&
        !(x === "in" && /^(set|sets|move|moves|moved|moving|come|comes|came|drop|dropped|check|checked|stop|pop|settle|settled|kick|kicks|kicked|sink|fill|filled|give|gave|hand|handed|turn|turned|log|break|broke|get|got|go|went|stay|stayed|move)$/.test(L(i - 1))) && !(x === "in" && (BE[L(i - 1)] || /'ll$/.test(L(i - 1)) || /^(be|been|stay|stays|stayed)$/.test(L(i - 1)))) &&
        !(x === "on" && /^(catch|catching|caught|up|carry|carried|go|going|went|work|working|worked|hold|held|keep|kept|move|moved|focus|focused|take|took|taking|get|got|rely|depend)$/.test(L(i - 1)))) fix(i, i + 1, T[i + 1].t, "no-prep");

    /* since / for */
    if (x === "since" && (numGt1(i + 1) || /^(a|an|one|few|several|many)$/.test(y)) && /^(years?|months?|weeks?|days?|hours?|minutes?)$/.test(L(i + 2) === "few" ? L(i + 3) : L(i + 2)) && L(i + 3) !== "ago" && L(i + 4) !== "ago") fix(i, i, "for", "since-for");
    if (x === "for" && T[i + 1] && T[i + 1].d && /^(19|20)\d\d$/.test(T[i + 1].t) && !N[L(i + 2)] && /\b(have|has|had|'ve|been)\b/i.test(text.slice(T[sStart[i]].s, T[i].s)) && !/^(yen|dollars|euros|rials|tomans|pounds)$/.test(L(i + 2))) fix(i, i, "since", "since-for");

    /* verb + preposition */
    if (GO[x] && y === "to" && L(i + 2) === "home") fix(i + 1, i + 2, T[i + 2].t, "go-home");
    if (GO[x] && y === "to" && /^(there|here)$/.test(L(i + 2)) && !/\b(from|here|there)\b/i.test(text.slice(T[sStart[i]].s, T[i].s))) fix(i + 1, i + 2, T[i + 2].t, "go-there");
    if (/^(go|goes|went|going|gone)$/.test(x) && y === "to" && TO_SPORT[L(i + 2)]) fix(i + 1, i + 2, T[i + 2].t, "go-ing");
    if (/^(listen|listens|listened|listening)$/.test(x) && /^(me|him|her|us|them|it|this|that|the|a|my|your|his|our|their|music|radio|songs|podcasts|podcast|news)$/.test(y) &&
        !/^(few|little|while|moment|minute|second|bit|long)$/.test(L(i + 2))) fix(i, i, T[i].t + " to", "listen-to");
    if (/^(look|looks|looked|looking)$/.test(x) && /^(me|him|her|us|them)$/.test(y) && !/^(up|over|in|out|down|after|straight|right|full|steadily|squarely|directly|between|square|dead)$/.test(L(i + 2)) &&
        !(y === "her" && isWord(i + 2))) fix(i, i, T[i].t + " at", "look-at");
    if (/^(wait|waits|waited|waiting)$/.test(x) && /^(me|him|her|us|them|you)$/.test(y) && L(i + 2) !== "out") fix(i, i, T[i].t + " for", "wait-for");
    if (x === "married" && y === "with" && /^(me|him|her|you|them|a|my|his)$/.test(L(i + 2)) && !/^(two|three|children|kids|a)$/.test(L(i + 2))) fix(i + 1, i + 1, "to", "married-to");
    if (/^(marry|marries|marrying)$/.test(x) && y === "with") fix(i, i + 1, T[i].t, "married-to");
    if (/^(discuss|discusses|discussed|discussing)$/.test(x) && y === "about") fix(i, i + 1, T[i].t, "discuss");
    if (/^(explain|explains|explained|explaining)$/.test(x) && /^(me|him|her|us|them)$/.test(y) && L(i + 2) !== "to" &&
        (/^(the|a|an|this|that|these|those|how|what|why|where|when|who|which|about|your|my|his|our|their|everything|something|it|again|once)$/.test(L(i + 2)) || i + 2 >= n || punct(i + 2)) &&
        !(y === "her" && (N2[L(i + 2)] || PL[L(i + 2)])) && !(y === "them" && (i + 2 >= n || punct(i + 2) || /^(again|once)$/.test(L(i + 2)))))
      fix(i, i, T[i].t + " to", "explain-to");
    if (/^(say|says|said|saying)$/.test(x) && /^(me|him|her|us)$/.test(y) && !(y === "her" && isWord(i + 2) && (N[L(i + 2)] || PL[L(i + 2)] || A[L(i + 2)] || KIN[L(i + 2)]))) fix(i, i, { say: "tell", says: "tells", said: "told", saying: "telling" }[x], "say-tell");
    if (/^(tell|tells|telling)$/.test(x) && y === "to" && /^(me|him|her|us|them|you)$/.test(L(i + 2))) fix(i, i + 1, T[i].t, "tell-to");
    if (/^(afraid|scared|frightened)$/.test(x) && y === "from") fix(i + 1, i + 1, "of", "afraid-of");
    if (x === "interested" && /^(about|on)$/.test(y)) fix(i + 1, i + 1, "in", "interested-in");
    if (/^(good|bad|better|best|great)$/.test(x) && y === "in" && !/^(no|any)$/.test(L(i - 1)) && (ING[L(i + 2)] || /^(english|math|maths|science|sports?|football|languages|drawing|swimming|cooking|chess)$/.test(L(i + 2)))) fix(i + 1, i + 1, "at", "good-at");
    if (/^(depend|depends|depended|depending)$/.test(x) && /^(of|to|from)$/.test(y)) fix(i + 1, i + 1, "on", "depend-on");
    if (/^(enter|enters|entered|entering)$/.test(x) && y === "to") fix(i, i + 1, T[i].t, "enter");
    if (/^(arrive|arrives|arrived|arriving)$/.test(x) && y === "to" && !isBase(L(i + 2))) fix(i + 1, i + 1, T[i + 2] && /^[A-Z]/.test(T[i + 2].t) ? "in" : "at", "arrive");
    if (/^(reach|reaches|reached|reaching)$/.test(x) && y === "to" && DET[L(i + 2)] && !/^(edge|end|top|bottom|floor|ceiling|ground|far|farthest|sky)$/.test(L(i + 3))) fix(i, i + 1, T[i].t, "reach");
    if (x === "in" && !N[L(i - 1)] && !/^(plug|plugs|plugged|plugging|tune|tuned)$/.test(L(i - 1)) && (y === "internet" || y === "the" && /^(internet|radio)$/.test(L(i + 2)) || y === "tv")) fix(i, y === "the" ? i + 2 : i + 1, y === "the" ? "on the " + T[i + 2].t : y === "tv" ? "on " + T[i + 1].t : "on the internet", "on-net");
    if (x === "in" && y === "the" && /^(wall|table|floor|desk|shelf|ceiling)$/.test(L(i + 2)) && /^(is|are|was|were)$/.test(L(i - 1)) && (i + 3 >= n || punct(i + 3))) fix(i, i, "on", "on-surface");
    if (/^(lacks|lacked)$/.test(x) && y === "of") fix(i, i + 1, T[i].t, "lack");
    if (/^(return|returns|returned|returning)$/.test(x) && y === "back") fix(i, i + 1, T[i].t, "return-back");

    /* verb patterns */
    var wantI = -1;
    if (/^(want|wants|wanted|need|needs|needed|decide|decides|decided|hope|hopes|hoped|plan|plans|planned)$/.test(x)) wantI = i;
    if (/^(like|love)$/.test(x) && (L(i - 1) === "would" || /'d$/.test(L(i - 1)) || SUBJ[L(i - 1)] && L(i - 2) === "would")) wantI = i;
    if (wantI >= 0 && !DET[L(i - 1)] && !POSS[L(i - 1)] && !/'s$/.test(L(i - 1)) && !A[L(i - 1)] && L(i - 1) !== "own" && !BE[L(i - 1)] && !(/^(need|needs)$/.test(x) && (y === "be" || /^(which|that|what)$/.test(L(i - 2)))) && !(x === "need" && L(i - 1) === "if" && y === "be")) {
      k = L(i + 1);
      if (TO_V[k] && !(k === "help" && !OBJ[L(i + 2)]) && !(/^(need|needs|needed)$/.test(x) && /^(help|study)$/.test(k)) && !(/^(plan|plans|hope)$/.test(x) && !SUBJ[L(i - 1)])) fix(i, i, T[i].t + " to", "want-to");
      else if (ING[k] && TO_V[ING[k]] && !/^(need|needs|needed|like|love)$/.test(x) && k !== "going" && !(SUBJ[L(i - 1)] && (N[L(i - 2)] || PERSON[L(i - 2)] || PL[L(i - 2)]))) fix(i + 1, i + 1, "to " + ING[k], "want-to");
      else if (OBJ[k] && TO_V[L(i + 2)] && /^(want|wants|wanted|like|love)$/.test(x) && !(k === "her" && (N2[L(i + 2)] || PL[L(i + 2)]) && (!isBase(L(i + 2)) || i + 3 >= n || punct(i + 3) || boundary(i + 3)))) fix(i + 1, i + 1, T[i + 1].t + " to", "want-to");
    }
    if (ING_AFTER[x] && y === "to" && isBase(L(i + 2)) && !DET[L(i - 1)] && L(i - 1) !== "of" && !(A[L(i - 1)] || N2[L(i - 1)] && !SUBJ[L(i - 1)] || /^(in|a|great|good|half|little|own)$/.test(L(i - 1)) || PL[x]) && !(/^(practise|practice)$/.test(x) && L(i + 2) === "deceive")) fix(i + 1, i + 2, ing(L(i + 2)), "enjoy-ing");
    if (/^(enjoy|enjoys|enjoyed)$/.test(x) && TO_V[y] && y !== "it" && !(A2[y] && (N2[L(i + 2)] || PL[L(i + 2)]))) fix(i + 1, i + 1, ing(y), "enjoy-ing");
    if (/^(let|lets|make|makes|made)$/.test(x) && OBJ[y] && y !== "it" && L(i + 2) === "to" && isBase(L(i + 3)) && !DET[L(i + 3)]) fix(i + 1, i + 2, T[i + 1].t, "let-to");
    if (x === "forward" && y === "to" && isBase(L(i + 2)) && /^(look|looking|looks|looked)$/.test(L(i - 1))) fix(i + 2, i + 2, ing(L(i + 2)), "forward-ing");

    /* adjectives */
    if (/s$/.test(x) && x !== "news" && ADJ_PL[x.slice(0, -1)] && PL[y] && !T3[y]) fix(i, i, T[i].t.slice(0, -1), "adj-pl");
    if ((x === "a" || x === "an") && N[y] && !A[y] && ADJ_ORDER[L(i + 2)] && L(i + 3) !== "-" &&
        !/^(old|long|short|tall|high|wide|deep|cold|orange|clean|dirty|hot)$/.test(L(i + 2)) && !/^(size|thing|person|bit|lot|kind|sort|shade|colour|color)$/.test(y) && !capMid(i + 1) && !(T[i + 3] && T[i + 3].t === "," && A[L(i + 4)]) &&
        (i + 3 >= n || punct(i + 3) || /^(and|but|in|on|at|from|for|with|because|when|today|yesterday|every)$/.test(L(i + 3)))) {
      fix(i, i + 2, article(T[i + 2].t) + " " + T[i + 2].t + " " + T[i + 1].t, "adj-order");
    }

    /* its / it's, your / you're */
    if (x === "its" && !finite(i + 2) && !/ed$/.test(L(i - 1)) && !(V[L(i - 1)] || PAST[L(i - 1)] || T3[L(i - 1)] || /^(before|in|of|on|at|for|with|from|by|to|into|about|under|after|as|than|like)$/.test(L(i - 1))) && /^(a|an|the|not|very|so|too|really|raining|snowing|going|getting|good|bad|ok|okay|true|time|important|nice|cold|hot|late|early|easy|difficult|possible|impossible|fine|my|your|his|our|their|me|him|us|them)$/.test(y) &&
        !(A[y] && (N[L(i + 2)] || PL[L(i + 2)])) && !(y === "very" && !A[L(i + 2)])) fix(i, i, T[i].t.charAt(0) === "I" ? "It's" : "it's", "its");
    if (x === "it's" && /^(own|color|colour|name|size|shape|legs|eyes|tail|owner|price|leaves|job)$/.test(y)) fix(i, i, T[i].t.charAt(0) === "I" ? "Its" : "its", "its2");
    if (x === "your" && /^(welcome|right|wrong|going|coming|doing|not|very|so|too|a|an|the|late|sure|kidding|joking|beautiful|amazing)$/.test(y) &&
        !(y === "going" && !(L(i + 2) === "to" && (isBase(L(i + 3)) || L(i + 3) === "be") || /^(home|out|now)$/.test(L(i + 2)) && (i + 3 >= n || punct(i + 3)))) &&
        !(/^(coming|doing)$/.test(y) && !/^(now|today|tonight|tomorrow|well|fine|great|good|ok|okay|here|there|home|back)$/.test(L(i + 2))) &&
        !(/^(right|wrong)$/.test(y) && !(i + 2 >= n || punct(i + 2) || /^(about|to|again|now|there)$/.test(L(i + 2)) && L(i + 2) !== "to") || /^(on|to|at|from|by|with|of|in)$/.test(L(i - 1))) &&
        !(/^(very|so|too)$/.test(y) && !(A[L(i + 2)] && !(N2[L(i + 3)] || PL[L(i + 3)]))) && !(y === "not" && (ING[L(i + 2)] || /ing$/.test(L(i + 2)))) && !(/^(a|an|the)$/.test(y) && !(i === sStart[i] || cs(i))) &&
        !(A[y] && (N[L(i + 2)] || PL[L(i + 2)] || KIN[L(i + 2)]))) fix(i, i, T[i].t.charAt(0) === "Y" ? "You're" : "you're", "youre");
    if (x === "you're" && /^(name|book|house|car|mother|father|friend|family|phone|homework|brother|sister|job|teacher)$/.test(y)) fix(i, i, T[i].t.charAt(0) === "Y" ? "Your" : "your", "your");
    if (x === "me" && y === "to" && (i + 2 >= n || punct(i + 2)) && (i === sStart[i] || L(i - 1) === "and" || T[i - 1].t === ",")) fix(i + 1, i + 1, "too", "me-too");

    /* these is -> these are; this are -> these are */
    if ((x === "these" || x === "those") && /^(is|was)$/.test(y) && cs(i)) fix(i + 1, i + 1, y === "is" ? "are" : "were", "this");
    if ((x === "this" || x === "that") && /^(are|were)$/.test(y) && i === sStart[i] && isWord(i + 2) && !/^(you|we|they)$/.test(L(i + 2))) fix(i, i, x === "this" ? "these" : "those", "this");
    /* Do you have got -> Have you got */
    if (/^(do|does)$/.test(x) && i === sStart[i] && SUBJ[y] && L(i + 2) === "have" && L(i + 3) === "got") fix(i, i + 2, (x === "does" ? "has" : "have") + " " + low1(T[i + 1].t), "have-got");
    /* frequency adverbs: "He always is" -> "He is always"; "I go always to" -> "I always go to" */
    if (FREQ[y] && (subjAt(i) || (N[x] || PL[x] || PLSUBJ[x]) && DET[L(i - 1)] && cs(i - 1)) && /^(am|is|are|was|were)$/.test(L(i + 2)) &&
        isWord(i + 3) && !PP[L(i + 3)] && !PAST[L(i + 3)]) {
      fix(i + 1, i + 2, T[i + 2].t + " " + T[i + 1].t, "freq", L(i + 1) === "never" && /^(was|were)$/.test(L(i + 2)) ? "note:در داستان‌ها و محاوره never was هم زیاد می‌آید؛ شکل معمول امروز was never است." : /^(always|usually|often|sometimes)$/.test(L(i + 1)) && /^(was|were)$/.test(L(i + 2)) ? "note:" + L(i + 1) + " " + L(i + 2) + " هم در انگلیسی گفته می‌شود (با تأکید)؛ شکل معمول‌تر " + L(i + 2) + " " + L(i + 1) + " است." : "");
    }
    if (subjAt(i) && cs(i) && !/^(that|which|who|whom)$/.test(L(i - 1)) && (isBase(y) || T3[y] && !V[y] || PAST[y] && !V[y]) && !HAVE[y] && !BE[y] && /^(always|usually|never|rarely|seldom)$/.test(L(i + 2)) &&
        isWord(i + 3) && !/^(been|before|again|mind)$/.test(L(i + 3)) && !(L(i + 3) === "to" && isBase(L(i + 4))) && !SUBJ[L(i + 3)] && !capMid(i + 3)) {
      fix(i + 1, i + 2, T[i + 2].t + " " + T[i + 1].t, "freq", PAST[y] && !V[y] ? "note:در داستان‌های قدیمی قید بعد از فعل هم می‌آمد (he ran always)؛ امروزه قبل از فعل: " + T[i + 2].t + " " + T[i + 1].t + "." : "");
    }
    /* I don't never -> I never (the verb takes the form the helper had) */
    if (DO_NEG[x] && y === "never" && isBase(L(i + 2))) {
      var nv = L(i + 2), nf = x === "didn't" ? past(nv) : x === "doesn't" ? third(nv) : nv;
      fix(i, i + 2, "never " + nf, "dbl-neg");
    }

    /* I am knowing -> I know */
    if (subjAt(i) && /^(am|is|are)$/.test(y) && STAT_ING[L(i + 2)]) {
      var sv = ING[L(i + 2)] || L(i + 2).replace(/ing$/, "");
      fix(i + 1, i + 2, SUBJ3[x] ? third(sv) : sv, "stative");
    }
    /* she cans -> she can */
    if (/^(cans|musts|shoulds|coulds|wills|mights|mays)$/.test(y) && (subjAt(i) || N[x] && DET[L(i - 1)]) && isBase(L(i + 2))) fix(i + 1, i + 1, y.slice(0, -1), "can-s");
    /* Don't to worry / Let's to go; Not touch it; Don't be worry */
    if ((x === "don't" || x === "let's") && y === "to" && isBase(L(i + 2)) && (i === sStart[i] || cs(i))) fix(i, i + 1, T[i].t, "imp-to");
    if (x === "not" && i === sStart[i] && isBase(y) && !ING[y]) fix(i, i, "Don't", "imp-not");
    if (x === "don't" && y === "be" && ED_ADJ[L(i + 2)] && i === sStart[i]) fix(i, i + 1, T[i].t, "imp-to");
    else if (/^(am|is|are|was|were|be|'m|'re)$/.test(x) && ED_ADJ[y] && y !== "interest" && !(x === "be" && L(i - 1) === "don't")) fix(i + 1, i + 1, regPast(y), "ed-adj");
    /* This is Sara book -> Sara's book */
    if (/^(is|was|'s)$/.test(x) && isWord(i + 1) && capMid(i + 1) && T[i + 1].t.indexOf("'") < 0 && !CAPS[y] && !N[y] && POSS_N[L(i + 2)] && /^[a-z]/.test(T[i + 2].t) && (i + 3 >= n || punct(i + 3))) fix(i + 1, i + 1, T[i + 1].t + "'s", "poss-s");

    /* going to calls / want to went -> base verb */
    if (x === "to" && /^(going|want|wants|wanted|need|needs|needed|have|has|had)$/.test(L(i - 1)) && isWord(i + 1) && !V[y] && !capMid(i + 1)) {
      var tb = T3[y] || PAST[y] || "";
      if (tb && !(y === "fell" && (DET[L(i + 2)] || numGt1(i + 2) || N2[L(i + 2)] || PL[L(i + 2)] || /^(hundreds|thousands|dozens)$/.test(L(i + 2))))) fix(i + 1, i + 1, tb, L(i - 1) === "going" ? "going-base" : "to-base");
    }
    /* I know him for ten years / I am here since morning -> present perfect */
    if (subjAt(i) && cs(i) && (/^(know|knows|live|lives|am|is|are)$/.test(y) || /^(have|has)$/.test(y) && /^(a|an|the|my|this|that|no)$/.test(L(i + 2))) && !ING[L(i + 2)] && !/\b(every|each|usually|always|often|sometimes|per|a day|a week|a month|a year)\b/i.test(text.slice(T[sStart[i]].s, T[sEnd[i]] ? T[sEnd[i]].e : text.length))) {
      for (j = i + 2; j <= sEnd[i] && j < n && !punct(j) && !(CONJ[L(j)] && L(j) !== "since"); j++) {
        var dur = L(j) === "for" && (numGt1(j + 1) || /^(a|an|many|several|ten|two)$/.test(L(j + 1))) && /^(years?|months?|weeks?|days?|hours?|minutes?|long|ages)$/.test(L(j + 2) === "long" ? "long" : L(j + 2)) ||
          L(j) === "since" && (T[j + 1] && T[j + 1].d || /^(last|yesterday|morning|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|then|childhood)$/.test(L(j + 1)));
        if (dur && !(L(j) === "for" && /^(am|is|are)$/.test(y))) { // "I'm here for two days" is fine
          var base = /^(am|is|are)$/.test(y) ? "be" : T3[y] || y, hv = SUBJ3[x] ? "has" : "have";
          fix(i + 1, i + 1, hv + " " + (base === "be" ? "been" : part(base)), "pp-for");
          break;
        }
      }
    }

    /* Because ..., so ... / Although ..., but ... */
    if ((x === "so" || x === "but") && T[i - 1] && T[i - 1].t === "," && L(sStart[i]) === (x === "so" ? "because" : "although") && isWord(i + 1)) fix(i - 1, i, ",", "because-so");
    /* If it will rain -> If it rains */
    if (x === "if" && (SUBJ[y] || INDEF[y]) && y !== "you" && L(i + 2) === "will" && isBase(L(i + 3)) && !unsure(i)) fix(i + 2, i + 3, SUBJ3[y] || INDEF[y] ? third(L(i + 3)) : L(i + 3), "if-will");
    /* the man which lives -> who */
    if (x === "which" && (PERSON[L(i - 1)] || KIN[L(i - 1)] || JOB[L(i - 1)]) && isWord(i + 1) && (T3[y] || PAST[y] && !V[y] || AUXQ[y] || SUBJ[y] || MODAL[y])) fix(i, i, "who", "who");
    /* the book which I bought it -> which I bought; a friend who he lives -> who lives */
    if (/^(which|who)$/.test(x) && (N[L(i - 1)] || PL[L(i - 1)] || PERSON[L(i - 1)]) && SUBJ[y] && (PAST[L(i + 2)] || isBase(L(i + 2)) || T3[L(i + 2)]) &&
        /^(it|him|her|them)$/.test(L(i + 3)) && (i + 4 >= n || punct(i + 4))) fix(i + 2, i + 3, T[i + 2].t, "rel-pron");
    if (x === "who" && (PERSON[L(i - 1)] || KIN[L(i - 1)] || JOB[L(i - 1)]) && /^(he|she|they)$/.test(y) &&
        /^(lives|live|lived|works|work|worked|is|are|was|were|comes|come|came|speaks|speak|teaches|plays)$/.test(L(i + 2))) fix(i, i + 1, T[i].t, "rel-pron");
    /* She sings good -> well */
    if (ACT[x] && y === "good" && (i + 2 >= n || punct(i + 2) || /^(and|but|too|today|now)$/.test(L(i + 2)))) fix(i + 1, i + 1, "well", "good-well");
    if (ACT[x] && CAPS[L(i + 1)] && L(i + 2) === "good" && (i + 3 >= n || punct(i + 3))) fix(i + 2, i + 2, "well", "good-well");
    /* He is enough old -> old enough */
    if (BE[x] && y === "enough" && A[L(i + 2)] && !N[L(i + 2)] && T[i + 2]) fix(i + 1, i + 2, T[i + 2].t + " enough", "enough");
    /* I don't have some money -> any */
    if ((/^(don't|doesn't|didn't|isn't|aren't|wasn't|weren't|haven't|hasn't)$/.test(x) && (/^(isn't|aren't|wasn't|weren't)$/.test(x) ? L(i - 1) === "there" && y === "some" : /^(have|want|need|see|buy|eat|drink|get|know)$/.test(y) && L(i + 2) === "some")) &&
        !/^(of|more|other|time)$/.test(L(i + (y === "some" ? 2 : 3)))) {
      var si = y === "some" ? i + 1 : i + 2; if (!ifWish(i)) fix(si, si, "any", "some-any");
    }

    /* double negatives */
    if ((/n't$/.test(x) || x === "not" || x === "never") && !(x === "not" && y === "to") && !(x === "not" && WH[L(i - 1)])) {
      var dv0 = skipAdv(i + 1);
      for (j = i + 1; j < n && !punct(j) && !/^(and|but|or|because|so|that|if|when|which|who|where|while|whom|whose|than|until|unless|though|although|whether|how|why|what|as|with|without|for|then|there|there's|like)$/.test(L(j)); j++) {
        k = L(j);
        if (j > dv0 && finite(j)) break;
        if (k === "no" && (ING[L(j + 1)] || /ing$/.test(L(j + 1)))) break;
        if (k === "nothing" && (/^(do|doing|did|done)$/.test(L(j - 1)) || j === i + 1 && x === "not")) break;
        if (k === "no" && /^(accept|accepts|accepted|want|hear|heard|a)$/.test(L(j - 1)) || k === "nowhere" && L(j - 1) === "of" || x === "not" && y === "only") break;
        if (k === "no" && /^(matter|longer|sooner|doubt|wonder|less|more|one)$/.test(L(j + 1)) && !(L(j + 1) === "more" && (j + 2 >= n || punct(j + 2))) && !(L(j + 1) === "one" && !finite(j + 2))) break;
        if (k === "no" && /^(say|says|said|saying|take|takes|took|taking|answer|answered)$/.test(L(j - 1))) break;
        if ((NEG_ANY[k] || k === "no" && L(j + 1) === "one") && finite(k === "no" ? j + 2 : j + 1) && !AUXQ[L(j - 1)]) break;
        if (NEG_ANY[k] && L(j - 1) !== "for") { fix(j, j, NEG_ANY[k], "dbl-neg"); break; }
        if (k === "no" && L(j + 1) === "one") { fix(j, j + 1, "anyone", "dbl-neg"); break; }
        if (k === "no" && isWord(j + 1)) { fix(j, j, "any", "dbl-neg"); break; }
      }
    }

    /* Me and my friend went -> My friend and I went */
    if (x === "me" && y === "and" && i === sStart[i]) {
      j = i + 2; if (POSS[L(j)] || L(j) === "the") j++;
      if (j < n && T[j].w && (N[L(j)] || KIN[L(j)] || /^[A-Z]/.test(T[j].t)) && T[j + 1] && T[j + 1].w && (V[L(j + 1)] || PAST[L(j + 1)] || /^(are|were|have|had)$/.test(L(j + 1)))) {
        fix(i, j, cap1(text.slice(T[i + 2].s, T[j].e)) + " and I", "me-and");
      }
    }

    /* ---------- B1 ---------- */
    /* passive: The letter was wrote -> written; The house was build -> built; I have been work -> working */
    if (/^(am|is|are|was|were|be|been|being)$/.test(x) || contrSubj(x)) {
      j = i + 1; if (L(j) === "not") j++; j = skipAdv(j); k = L(j);
      var pb = PAST[k], cx = contrSubj(x);
      var subjP = cx ? (cx !== "it" ? cx : "") : x !== "be" && x !== "been" && SUBJ[L(i - 1)] && L(i - 1) !== "it" ? L(i - 1) :
        (x === "been" || x === "be") && (HAVE[L(i - 1)] || MODAL[L(i - 1)]) && SUBJ[L(i - 2)] && L(i - 2) !== "it" ? L(i - 2) : "";
      if (T[j] && T[j].w && !capMid(j) && !(T[j + 1] && T[j + 1].s === T[j].e && T[j + 1].t !== "'" && !punct(j + 1)) && (x === "been" && HAVE[L(i - 1)] || !(PL[k] && !V[k]) && k !== "bit" && !(A2[k] && !CAUS_V[k]) && !(N2[k] && !CAUS_V[k] && (j + 1 >= n || punct(j + 1) || boundary(j + 1)))) && !(x === "being" && (L(i - 1) === "for" || /^(human|a|the|every|living|sentient|other)$/.test(L(i - 1)))) && !/ing$/.test(k) && L(j + 1) !== "-" && !(L(j + 1) === "of" && N2[k]) && !/^(gonna|wanna|gotta)$/.test(k) &&
        !/\b(did|do|does)\b/i.test(text.slice(T[sStart[i]].s, T[i].s)) && L(i - 1) !== "there" && !/^(fall|spring|summer|winter|autumn)$/.test(k) && L(j + 1) !== "and") {
        if (pb && IRR[pb] && IRR[pb][0] !== IRR[pb][1] && k === IRR[pb][0] && !V[k] && !N[k] && !A[k] &&
            !/^(broke|lay|went|came|became|ran|fell|rose|got|grew|sat|stood|was|were|did|had|bore|wound|hid)$/.test(k))
          fix(j, j, IRR[pb][1], "pass-pp");
        else if (x === "been" && subjP && HAVE[L(i - 1)] && isBase(k) && part(k) !== k && !N[k] && !A[k] && !/ed$/.test(k) && !/^(used|let|better|like|love|cross|fit|lean)$/.test(k))
          fix(j, j, ing(k), /^(had|hadn't)$/.test(L(i - 1)) ? "pastpc-ing" : "ppc-ing");
        else if (isBase(k) && part(k) !== k && !/ed$/.test(k) && !N[k] && !A[k] && !/^(hope|change|talk|love|fear|help|trouble|doubt|rest|peace|fun|work|use|need|care|damage|harm|progress|practice|research|return|result|risk|support|interest|concern|control|regret|respect|desire|delight|joy|shame|sleep|silence|search|increase|decrease|release|struggle|response|drop)$/.test(k) && !UNC_SOFT[k] && !UNC_STRICT[k] && !(BE_V[k] && !/^(been|being|be)$/.test(x)) && !/^(used|let|better|like|love|mean|seem|lie|lay|cross|fit|lean|control|worry|fly|pay|guess|practise|practice|turn|correct|complete|perfect|secure|mature|separate|close|clear|free|open)$/.test(k) && !/ate$/.test(k) &&
            (boundary(j + 1) || /^(by|yesterday|ago|last|tomorrow|soon|every)$/.test(L(j + 1)))) {
          if (x === "being" || !subjP) fix(j, j, part(k), "pass-pp");
        }
      }
    }
    /* The accident was happened -> happened */
    if (/^(was|were)$/.test(x) && INTR[y] && !/ing$/.test(L(i - 1))) fix(i, i + 1, past(INTR[y]), "pass-intr");
    /* I am waiting for two hours -> I have been waiting */
    var pcS = subjAt(i) && cs(i) && /^(am|is|are)$/.test(y) ? 1 : contrSubj(x) && (cs(i) || i === sStart[i]) ? 2 : 0;
    if (pcS) {
      var gi = pcS === 1 ? i + 2 : i + 1, gw = L(gi);
      if (ING[gw] && !STAT_ING[gw] && !/^(going|coming|leaving|staying|visiting|travelling|traveling|flying|moving|meeting|getting|planning|hoping|intending|thinking|renting|remaining|starting|beginning|returning|taking)$/.test(gw)) {
        for (j = gi + 1; j <= sEnd[i] && j < n && !punct(j) && !(CONJ[L(j)] && L(j) !== "since") && !(L(j) === "to" && isBase(L(j + 1))); j++) {
          var d2 = L(j) === "since" && (T[j + 1] && T[j + 1].d || /^(last|yesterday|morning|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|then|childhood|lunch|breakfast)$/.test(L(j + 1))) ||
            L(j) === "for" && (numGt1(j + 1) || /^(a|an|many|several)$/.test(L(j + 1))) && (/^(years?|months?|weeks?|days?|hours?|ages)$/.test(L(j + 2)) || L(j + 2) === "long" && /^(time|while)$/.test(L(j + 3))) || L(j) === "for" && L(j + 1) === "ages";
          if (d2) {
            if (pcS === 1) fix(i + 1, i + 1, (SUBJ3[x] ? "has" : "have") + " been", "ppc");
            else fix(i, i, T[i].t.split("'")[0] + (/'s$/.test(x) ? "'s" : "'ve") + " been", "ppc");
            break;
          }
        }
      }
    }
    /* When I arrived, the train already left -> had already left */
    if (x === "already" && PAST[y] && (SUBJ[L(i - 1)] || N[L(i - 1)] || KIN[L(i - 1)] || PERSON[L(i - 1)]) && !V[y] && !STATIVE[PAST[y]] && !/^(was|were|had|knew|understood)$/.test(y) && !HAVE[L(i - 1)] && !/'d$/.test(L(i - 1)) && !isQ(i) && !/\b(have|has|haven't|hasn't|had)\b/i.test(text.slice(T[sStart[i]].s, T[i].s)) &&
        /\b(when|by the time|before)\b/i.test(text.slice(T[sStart[i]].s, T[sEnd[i]] ? T[sEnd[i]].e : text.length))) fix(i, i + 1, "had already " + part(PAST[y]), "already-had");
    /* I use to play -> used to; I used to playing -> play; I am used to wake up -> waking */
    if (x === "use" && y === "to" && (SUBJ[L(i - 1)] && L(i - 1) !== "it" && cs(i - 1) && !/^(that|which|who|whom)$/.test(L(i - 2)) && !AUXQ[L(i - 2)] && !N[L(i - 2)] && !PL[L(i - 2)]) && isBase(L(i + 2)) && !/^(did|didn't|do|don't|does|doesn't)$/.test(L(i - 2))) fix(i, i, "used", "used-to");
    if (x === "used" && y === "to" && T[i + 2] && T[i + 2].w) {
      var ub = L(i - 1), beB = /^(am|is|are|was|were|be|been|get|gets|got|getting|become)$/.test(ub) || !!contrSubj(ub), gw2 = L(i + 2);
      var beSubj = contrSubj(ub) || (SUBJ[L(i - 2)] ? L(i - 2) : "");
      if (!beB && (SUBJ[ub] || KIN[ub] || PLSUBJ[ub]) && ING[gw2] && gw2 !== "being") fix(i + 2, i + 2, ING[gw2], "used-to");
      else if (beB && beSubj && beSubj !== "it" && isBase(gw2)) fix(i + 2, i + 2, ing(gw2), "used-to");
    }
    /* I'll call you when I will arrive -> when I arrive */
    var tw = -1;
    if (/^(when|before|after|until|till|unless|once)$/.test(x)) tw = i + 1;
    else if (x === "as" && y === "soon" && L(i + 2) === "as") tw = i + 3;
    if (tw > 0 && SUBJ[L(tw)] && L(tw + 1) === "will" && isBase(L(tw + 2)) && !askBefore(i) && !(i === sStart[i] && isQ(i)) && !(x === "when" && N[L(i - 1)]) && !/^(time|day|days|moment|year|years|morning|night)$/.test(L(i - 1)) &&
        !(x === "when" && (T[i - 1] && T[i - 1].t === "," || /^(come|comes|coming)$/.test(L(i - 1)))) &&
        !/\b(know|knows|knew|sure|certain|uncertain|unsure|wonder|wondering|ask|asked|idea|tell|decide|question|clear|guess|predict|say)\b/i.test(text.slice(T[sStart[i]].s, T[i].s)))
      fix(tw + 1, tw + 2, presentOf(L(tw), L(tw + 2)), "time-will");
    /* Unless you don't hurry -> Unless you hurry */
    if (x === "unless" && SUBJ[y] && DO_NEG[L(i + 2)] && isBase(L(i + 3))) {
      var uv = L(i + 3); fix(i + 2, i + 3, L(i + 2) === "didn't" ? past(uv) : L(i + 2) === "doesn't" ? third(uv) : uv, "unless-not");
    }
    /* If I would have more money -> If I had */
    if (x === "if" && SUBJ[y] && y !== "you" && L(i + 2) === "would" && i === sStart[i] && laterWould(i)) {
      k = L(i + 3);
      if (k === "be") fix(i + 2, i + 3, "were", "if-would");
      else if (isBase(k) && !/^(like|mind|prefer|have)$/.test(k)) fix(i + 2, i + 3, past(k), "if-would");
      else if (k === "have" && !PP[L(i + 4)] && !PAST[L(i + 4)] && L(i + 4) !== "been") fix(i + 2, i + 3, "had", "if-would");
    }
    /* If I knew the answer, I will tell you -> I would tell you */
    if (x === "if" && i === sStart[i] && SUBJ[y] && /^(were|knew|had)$/.test(L(i + 2)) && !(L(i + 2) === "had" && (PP[L(i + 3)] || PAST[L(i + 3)]))) {
      for (j = i + 3; j < sEnd[i] && j < n && T[j].t !== ","; j++);
      if (T[j] && T[j].t === "," && SUBJ[L(j + 1)] && L(j + 2) === "will" && isBase(L(j + 3))) fix(j + 2, j + 2, "would", "if-would");
    }
    /* Do you know where is the station? -> where the station is; I don't know where does he live -> where he lives */
    if (WH[x] && i !== sStart[i] && askBefore(i) && !punct(i - 1)) {
      j = i + 1;
      if (/^(what|which|how)$/.test(x) && /^(time|old|much|many|long|far|big|often|colou?r|size|day)$/.test(L(j))) j++;
      k = L(j);
      if (/^(is|are|was|were)$/.test(k)) {
        var a2 = j + 1, b2 = -1;
        if (SUBJ[L(a2)]) b2 = a2;
        else if (DET[L(a2)]) { b2 = a2 + 1; while (b2 < a2 + 3 && isWord(b2 + 1) && (N[L(b2 + 1)] || PL[L(b2 + 1)] || KIN[L(b2 + 1)])) b2++; }
        else if (T[a2] && T[a2].w && /^[A-Z]/.test(T[a2].t) && T[a2].t !== "I") { b2 = a2; if (T[a2 + 1] && T[a2 + 1].w && /^[A-Z]/.test(T[a2 + 1].t)) b2++; }
        if (/^(what|who|which|whose)$/.test(x) && j === i + 1 && !SUBJ[L(a2)]) b2 = -1;
        if (b2 >= 0 && T[b2] && T[b2].w && (b2 + 1 >= n || punct(b2 + 1))) fix(j, b2, text.slice(T[a2].s, T[b2].e) + " " + T[j].t, "ind-q");
      } else if (/^(do|does|did)$/.test(k)) {
        var a3 = j + 1, b3 = -1;
        if (SUBJ[L(a3)]) b3 = a3; else if ((POSS[L(a3)] || L(a3) === "the") && (N[L(a3 + 1)] || KIN[L(a3 + 1)])) b3 = a3 + 1;
        if (b3 >= 0 && isBase(L(b3 + 1))) {
          var v3 = L(b3 + 1), f3 = k === "did" ? past(v3) : k === "does" ? third(v3) : v3;
          fix(j, b3 + 1, low1(text.slice(T[a3].s, T[b3].e)) + " " + f3, "ind-q");
        }
      }
    }
    /* He told that he was tired -> said */
    if (/^(told|tells)$/.test(x) && y === "that" && SUBJ[L(i + 2)] && (SUBJ[L(i - 1)] || KIN[L(i - 1)]) && !/^(get|got|gets)$/.test(L(i - 1)))
      fix(i, i, { told: "said", tells: "says" }[x], "said-told");
    /* You don't must -> You mustn't; I didn't can -> I couldn't */
    if (DO_NEG[x] && /^(can|must|should|will)$/.test(y) && isBase(L(i + 2)))
      fix(i, i + 1, { can: x === "didn't" ? "couldn't" : "can't", must: "mustn't", should: "shouldn't", will: "won't" }[y], "neg-modal");
    /* so a nice day -> such a nice day; too much hot -> too hot */
    if (x === "so" && (y === "a" || y === "an") && (BE[L(i - 1)] || !!contrSubj(L(i - 1)) || /^(have|has|had|was|saw|seen)$/.test(L(i - 1))) && A[L(i + 2)] && isWord(i + 3) && (N[L(i + 3)] || KIN[L(i + 3)] || PERSON[L(i + 3)] || A[L(i + 3)])) fix(i, i + 1, "such " + T[i + 1].t, "so-such");
    if (x === "too" && y === "much" && A[L(i + 2)] && !N[L(i + 2)] && !UNC_SOFT[L(i + 2)] && !/^(more|less|much|many|fat|cold|good|bad|evil|dark|light|sweet|salt|heat|wet|red|white|black|green|afraid|alike|alone|aware|asleep|awake|alive|ashamed)$/.test(L(i + 2)) &&
        (i + 3 >= n || punct(i + 3) || /^(to|for|and|but|today|now)$/.test(L(i + 3)))) fix(i, i + 1, T[i].t, "too-much");
    /* Most of people -> Most people; the most of the students -> most of the students; a few money -> a little money */
    if (x === "most" && y === "of" && (PL[L(i + 2)] && !T3[L(i + 2)] || PLSUBJ[L(i + 2)]) && L(i - 1) !== "the") fix(i, i + 1, T[i].t, "most-of");
    if (x === "the" && y === "most" && L(i + 2) === "of" && !/^(make|makes|made|making)$/.test(L(i - 1))) {
      if (DET[L(i + 3)] || OBJ[L(i + 3)]) fix(i, i + 1, "most", "most-of");
      else if (PL[L(i + 3)] && !T3[L(i + 3)] || PLSUBJ[L(i + 3)]) fix(i, i + 2, "most", "most-of");
    }
    if (x === "a" && y === "few" && (UNC_STRICT[L(i + 2)] || UNC_SOFT[L(i + 2)]) && L(i + 2) !== "time") fix(i + 1, i + 1, "little", "few-little");
    if (x === "a" && y === "little" && PL[L(i + 2)] && !T3[L(i + 2)] && !N[L(i + 2)] && !A[L(i + 2)] && !/^(ways|nuts|bits|odds|thanks)$/.test(L(i + 2))) fix(i + 1, i + 1, "few", "few-little");
    /* turn off it -> turn it off */
    if (PHR_F[x] && PHR[PHR_F[x]].indexOf(" " + y + " ") >= 0 && /^(it|them|him|her|me|us)$/.test(L(i + 2)) &&
        !(PHR_F[x] === "turn" && y === "on" && L(i + 2) !== "it") && !DET[L(i - 1)] &&
        (i + 3 >= n || punct(i + 3) || /^(in|on|at|to|with|for|from|into|and|when|because|again|now|please|quickly|later|tomorrow|today|first|carefully)$/.test(L(i + 3))))
      fix(i + 1, i + 2, T[i + 2].t + " " + T[i + 1].t, "phr-sep");
    /* I hurt me -> myself; by my own -> on my own; each others -> each other */
    if (x === "by" && POSS[y] && L(i + 2) === "own" && (i + 3 >= n || punct(i + 3) || /^(and|but|because|when|now|today)$/.test(L(i + 3)))) fix(i, i, "on", "reflex");
    if (x === "each" && y === "others" && L(i + 2) !== "'") fix(i + 1, i + 1, "other", "reflex");
    if ((x === "i" || x === "we" || x === "you") && subjAt(i)) {
      j = skipAdv(i + 1); k = L(j);
      var ro = { i: "me", we: "us", you: "you" }[x];
      if (REFL_V[k] && L(j + 1) === ro && (j + 2 >= n || punct(j + 2) || /^(in|at|with|on|when|and|very|a)$/.test(L(j + 2))) && !(/^(see|saw|look|looked)$/.test(k) && L(j + 2) !== "in"))
        fix(j + 1, j + 1, { i: "myself", we: "ourselves", you: "yourself" }[x], "reflex");
    }
    /* gerund or infinitive */
    if (ING_AFTER2[x] && y === "to" && isBase(L(i + 2)) && !BE[L(i - 1)] && !DET[L(i - 1)] && L(i - 1) !== "of" && L(i - 1) !== "-" && !A[L(i - 1)] && !POSS[L(i - 1)] && !(/ed$/.test(x) && L(i + 2) === "have")) fix(i + 1, i + 2, ing(L(i + 2)), "ing-after2");
    if (x === "up" && /^(give|gives|gave|given|giving)$/.test(L(i - 1)) && y === "to" && isBase(L(i + 2))) fix(i + 1, i + 2, ing(L(i + 2)), "ing-after2");
    if (x === "worth" && y === "to" && isBase(L(i + 2)) && L(i - 1) !== "-") fix(i + 1, i + 2, ing(L(i + 2)), "ing-after2");
    if ((x === "without" || x === "of" && L(i - 1) === "instead") && isBase(y) && !N[y] && !A[y] && !UNC_SOFT[y] && !/^(doubt|question|fail|warning|charge|delay|end|limit|notice|stop|care|trace|pause|return)$/.test(y) &&
        (OBJ[L(i + 2)] || DET[L(i + 2)] || /^(anything|something|goodbye|it)$/.test(L(i + 2)))) fix(i + 1, i + 1, ing(y), "prep-ing");
    if (TO_AFTER[x] && ING[y] && y !== "going" && !N[y] && !N[L(i + 2)] && !PL[L(i + 2)] && !DET[L(i - 1)]) fix(i + 1, i + 1, "to " + ING[y], "to-inf");
    if (x === "for" && TO_V[y] && isBase(y) && !N[y] && !/^(help|study|work|love|rest)$/.test(y) && (DET[L(i + 2)] || OBJ[L(i + 2)] || /^(some|any|it|english)$/.test(L(i + 2))) &&
        (V[L(i - 1)] || PAST[L(i - 1)] || T3[L(i - 1)] || /^(there|here|home)$/.test(L(i - 1)))) fix(i, i + 1, "to " + T[i + 1].t, "to-purpose");

    /* ---------- B2 ---------- */
    /* If I would have known -> If I had known; If we have left earlier, we would have ... -> had left */
    if (x === "if" && SUBJ[y] && !askBefore(i) && !/^(as|even)$/.test(L(i - 1)) && (perfWould(sStart[i], i - 1) || perfWould(i + 4, sEnd[i]))) {
      if (L(i + 2) === "would" && L(i + 3) === "have" && (PP[L(i + 4)] || PAST[L(i + 4)] || L(i + 4) === "been")) fix(i + 2, i + 3, "had", "third-cond");
      else if (/^(have|has)$/.test(L(i + 2)) && (PP[L(i + 3)] || L(i + 3) === "been")) fix(i + 2, i + 2, "had", "third-cond");
    }
    /* I wish I have -> had; I wish I can -> could; I wish I am -> were; I wish you will pass -> I hope */
    if (/^(wish|wishes|wished)$/.test(x)) {
      k = i - 1; while (k >= 0 && ADVS[L(k)]) k--;
      j = i + 1; if (L(j) === "that") j++;
      var ws = L(j), wv = L(j + 1), wHope = { wish: "hope", wishes: "hopes", wished: "hoped" }[x];
      if (SUBJ[L(k)] && L(k) !== "it" && SUBJ[ws] && T[j + 1] && T[j + 1].w && !isQ(i)) {
        var wTo = "";
        if (/^(am|is|are)$/.test(wv)) wTo = "were";
        else if (/^(isn't|aren't)$/.test(wv) || wv === "am" && L(j + 2) === "not") wTo = "weren't";
        else if (/^(have|has)$/.test(wv)) wTo = "had";
        else if (/^(haven't|hasn't)$/.test(wv)) wTo = "hadn't";
        else if (wv === "can") wTo = "could";
        else if (wv === "can't") wTo = "couldn't";
        else if (/^(don't|doesn't)$/.test(wv)) wTo = "didn't";
        else if (wv === "would" && (ws === "i" || ws === "we") && isBase(L(j + 2))) wTo = "could";
        else if (isBase(wv) && !N[wv] && past(wv) !== wv) wTo = past(wv);
        else if (T3[wv] && !V[wv] && !N[wv]) wTo = past(T3[wv]);
        var wSub = text.slice(T[j].s, T[j].e);
        if (wv === "will" && isBase(L(j + 2))) fix(i, i, wHope, "wish-hope");
        else if (wTo && (ws === "i" || ws === "we")) fix(j + 1, j + 1, wTo, "wish");
        else if (wTo) fix(i, j + 1, x + " " + (L(j - 1) === "that" ? "that " : "") + wSub + " " + wTo, "wish", "alt:" + wHope + " " + (L(j - 1) === "that" ? "that " : "") + wSub + " " + T[j + 1].t);
      }
    }
    /* You should of told me -> should have */
    if (/^(should|could|would|must|might|may|shouldn't|couldn't|wouldn't|mustn't)$/.test(x) && y === "of" && (PP[L(i + 2)] || PAST[L(i + 2)] || L(i + 2) === "been")) fix(i + 1, i + 1, "have", "modal-have");
    /* I was waiting for two hours when he arrived -> had been waiting */
    if (subjAt(i) && cs(i) && /^(was|were)$/.test(y) && ING[L(i + 2)] && !STAT_ING[L(i + 2)] && L(i + 2) !== "going") {
      for (j = i + 3; j <= sEnd[i] && j < n && !punct(j) && !CONJ[L(j)]; j++) {
        if (L(j) === "for" && (numGt1(j + 1) || /^(a|an|many|several)$/.test(L(j + 1))) && /^(years?|months?|weeks?|days?|hours?|minutes)$/.test(L(j + 2)) || L(j) === "for" && /^(ages|years|months|weeks|days|hours|decades)$/.test(L(j + 1))) {
          for (k = j + 2; k <= sEnd[i] && k < n && L(k) !== "when" && L(k) !== "before" && !(L(k) === "by" && L(k + 1) === "the" && L(k + 2) === "time"); k++);
          if (k <= sEnd[i] && k < n && (SUBJ[L(k + 1)] ? finite(k + 2) : DET[L(k + 1)] && finite(k + 3))) fix(i + 1, i + 1, "had been", "pastpc");
          break;
        }
      }
    }
    /* We have been living there for five years when the war started -> had been */
    if (subjAt(i) && /^(have|has)$/.test(y) && L(i + 2) === "been" && ING[L(i + 3)]) {
      for (j = i + 4; j <= sEnd[i] && j < n && L(j) !== "when" && !punct(j) && !CONJ[L(j)]; j++);
      if (L(j) === "when" && (SUBJ[L(j + 1)] || DET[L(j + 1)]) && (PAST[L(j + 2)] && !V[L(j + 2)] || PAST[L(j + 3)] && !V[L(j + 3)])) fix(i + 1, i + 1, "had", "pastpc");
    }
    /* She had been knowing him -> had known */
    if (/^(had|have|has)$/.test(x) && y === "been" && /^(knowing|understanding|believing|belonging)$/.test(L(i + 2))) fix(i + 1, i + 2, part(ING[L(i + 2)]), "stative");
    /* I will be work -> working (a person as the subject; "The house will be built" is a passive) */
    if (x === "be" && (/^(will|won't)$/.test(L(i - 1)) && /^(i|you|he|she|we)$/.test(L(i - 2)) || /^(i|you|he|she|we)'ll$/.test(L(i - 1)))) {
      j = skipAdv(i + 1); k = L(j);
      if (T[j] && T[j].w && isBase(k) && !N[k] && !A[k] && part(k) !== k && !/ed$/.test(k) && !/^(like|love|used|let|back|home|over|out|up|down|off|away|there|here|free|open|worth|able|sure|cross|content|present|last|close|clear|calm|quiet|slow|fine|well)$/.test(k) && L(j + 1) !== "by" && L(j + 1) !== "to")
        fix(j, j, ing(k), "fut-cont");
    }
    /* I had my car repair -> repaired */
    if (/^(have|has|had|having|get|gets|got|getting)$/.test(x) && POSS[y] && (N[L(i + 2)] || PL[L(i + 2)] || CAUS_OBJ[L(i + 2)]) && !PERSON[L(i + 2)] && !KIN[L(i + 2)] && !JOB[L(i + 2)]) {
      k = L(i + 3);
      if (T[i + 3] && T[i + 3].w && CAUS_V[k] && part(k) !== k && (i + 4 >= n || punct(i + 4) || /^(yesterday|today|tomorrow|last|next|every|by|before|soon|once|again|now|at|in|on|and|but)$/.test(L(i + 4))))
        fix(i + 3, i + 3, part(k), "causative");
    }
    /* She is said to stole the money -> to have stolen; It is say that -> said; You are suppose to -> supposed */
    if (/^(said|believed|thought|known|reported|expected|supposed|considered|rumoured|rumored)$/.test(x) && (/^(is|are|was|were|am)$/.test(L(i - 1)) || contrSubj(L(i - 1))) && y === "to" &&
        T[i + 2] && T[i + 2].w && PAST[L(i + 2)] && !V[L(i + 2)]) fix(i + 1, i + 2, "to have " + part(PAST[L(i + 2)]), "pass-rep");
    if (x === "it" && /^(is|was)$/.test(y) && /^(say|believe|think|know|expect|report|consider|hope|fear|estimate)$/.test(L(i + 2)) && L(i + 3) === "that") fix(i + 2, i + 2, part(L(i + 2)), "pass-rep");
    if (y === "suppose" && L(i + 2) === "to" && (/^(am|is|are|was|were|be|been|isn't|aren't|wasn't|weren't|not)$/.test(x) || contrSubj(x))) fix(i + 1, i + 1, "supposed", "pass-rep");
    /* He suggested me to go -> suggested that I go; She insisted to pay -> insisted on paying; accused him for -> of; apologized for be -> being */
    if (/^(suggest|suggests|suggested)$/.test(x) && OBJ_SUBJ[y] && L(i + 2) === "to" && isBase(L(i + 3))) fix(i + 1, i + 3, "that " + OBJ_SUBJ[y] + " " + L(i + 3), "rep-verb");
    if (/^(insist|insists|insisted|insisting)$/.test(x) && y === "to" && isBase(L(i + 2))) fix(i + 1, i + 2, "on " + ing(L(i + 2)), "rep-verb");
    if (/^(accuse|accuses|accused|accusing)$/.test(x)) {
      j = i + 1; if (OBJ[L(j)]) j++; else if (DET[L(j)] && (N[L(j + 1)] || PERSON[L(j + 1)] || KIN[L(j + 1)])) j += 2; else j = -1;
      if (j > 0 && L(j) === "for" && T[j + 1] && T[j + 1].w) fix(j, j, "of", "rep-verb");
    }
    if (/^(apologize|apologizes|apologized|apologise|apologises|apologised|apologizing|apologising)$/.test(x) && y === "for" && (L(i + 2) === "be" || isBase(L(i + 2)) && !N[L(i + 2)]) && !/^(it|that)$/.test(L(i + 2)))
      fix(i + 2, i + 2, ing(L(i + 2)), "rep-verb");
    /* The man who his car was stolen -> whose car; a friend that her father is -> whose father */
    if (/^(who|that)$/.test(x) && /^(his|her|their|its)$/.test(y) && (N[L(i + 2)] || KIN[L(i + 2)] || PL[L(i + 2)]) && finite(i + 3) &&
        (x === "who" && (N[L(i - 1)] || PL[L(i - 1)]) || PERSON[L(i - 1)] || KIN[L(i - 1)] || JOB[L(i - 1)]) && !/(ask|asked|tell|told|know|knew|show|showed|remind|reminded|inform|informed|warn|warned|convince|convinced|wonder|sure|explain|explained)\b/i.test(text.slice(T[Math.max(sStart[i], i - 4)].s, T[i].s)))
      fix(i, i + 1, "whose", "whose");
    /* My brother, that lives in Tehran, is ... -> who lives */
    if (x === "that" && T[i - 1] && T[i - 1].t === "," && (finite(i + 1) || MODAL[y]) && T[i + 2] && T[i + 2].t !== "," && i - 2 >= sStart[i]) {
      var rn = L(i - 2), rWho = PERSON[rn] || KIN[rn] || JOB[rn] ? "who" : N[rn] || PL[rn] || CAPS[T[i - 2].t] || CAPS[rn] ? "which" : "";
      for (j = i + 2; j < sEnd[i] && j < n && T[j].t !== ","; j++);
      if (rWho && T[j] && T[j].t === "," && finite(j + 1)) fix(i, i, rWho, "rel-comma");
    }
    /* Everything what he said -> Everything that */
    if (x === "what" && /^(everything|all|something|anything|nothing)$/.test(L(i - 1)) && !(L(i - 1) === "all" && L(i - 2) === "at") && (SUBJ[y] || DET[y]) && !/^(is|was|that's|it's)$/.test(L(i - 2)) && !askBefore(i)) fix(i, i, "that", "all-that");
    /* Despite of the rain -> Despite the rain; In spite the rain -> In spite of; Despite it was raining -> Although; because of it was -> because */
    if (x === "despite" && y === "of" && L(i + 2) !== "course") fix(i, i + 1, T[i].t, "despite");
    if (x === "in" && y === "spite" && L(i + 2) !== "of" && isWord(i + 2)) fix(i + 1, i + 1, "spite of", "despite");
    var dsp = x === "despite" ? i + 1 : x === "in" && y === "spite" && L(i + 2) === "of" ? i + 3 : x === "because" && y === "of" ? i + 2 : -1;
    if (dsp > 0) {
      // "Despite the weather was bad, ..." only at the start: "Hating people because of their race is wrong" is fine
      var dv = SUBJ[L(dsp)] ? dsp + 1 : x !== "because" && i === sStart[i] && DET[L(dsp)] && (N[L(dsp + 1)] || PL[L(dsp + 1)]) && /,/.test(text.slice(T[dsp].e, T[Math.min(sEnd[i], n - 1)].e)) ? dsp + 2 : -1;
      if (dv > 0 && finite(dv))
        fix(i, dsp - 1, x === "because" ? "because" : "although", "despite");
    }
    /* I would rather to stay -> rather stay; You had better to go / better went -> better go; I prefer tea than coffee -> to coffee */
    if (/^(rather|better)$/.test(x) && (/^(would|had)$/.test(L(i - 1)) || /'d$/.test(L(i - 1)))) {
      if (y === "to" && isBase(L(i + 2))) fix(i, i + 1, T[i].t, "rather");
      else if (y === "not" && L(i + 2) === "to" && isBase(L(i + 3))) fix(i + 1, i + 2, "not", "rather");
      else if (ING[y] && !N[y] && y !== "being") fix(i + 1, i + 1, ING[y], "rather");
      else if (x === "better" && PAST[y] && !V[y] && !N[y] && !A[y] && !PP[y]) fix(i + 1, i + 1, PAST[y], "rather");
      else if (x === "better" && PAST[y] && !V[y] && IRR[PAST[y]] && IRR[PAST[y]][0] === y && IRR[PAST[y]][0] !== IRR[PAST[y]][1]) fix(i + 1, i + 1, PAST[y], "rather");
    }
    if (/^(prefer|prefers|preferred|preferring)$/.test(x)) {
      if ((isBase(y) && !N[y] && !A[y] || y === "stay" || y === "go") && T[i + 1].w && !OBJ[L(i + 2)] && !N[L(i + 2)] && !PL[L(i + 2)] && !UNC_SOFT[L(i + 2)] && !UNC_STRICT[L(i + 2)]) fix(i + 1, i + 1, "to " + T[i + 1].t, "rather");
      else for (j = i + 2; j <= i + 6 && j < n && !punct(j) && !(CONJ[L(j)] && L(j) !== "than"); j++) if (L(j) === "than") {
        if (!/^(rather|more|less|much)$/.test(L(j - 1))) fix(j, j, y === "to" ? "rather than" : "to", "rather");
        break;
      }
    }

    /* ---------- C1 ---------- */
    /* Never I have seen -> Never have I seen; Only then I realized -> did I realize; No sooner ... when -> than */
    if (i === sStart[i]) {
      var ie = /^(never|rarely|seldom|hardly|scarcely|little)$/.test(x) ? i : (x === "no" && y === "sooner" || x === "not" && y === "only" || x === "only" && /^(then|later|now|recently|afterwards)$/.test(y)) ? i + 1 :
        (x === "under" && y === "no" && L(i + 2) === "circumstances" || x === "at" && y === "no" && L(i + 2) === "time") ? i + 2 : -1;
      var is = ie + 1, ia = L(is + 1);
      if (ie >= 0 && SUBJ[L(is)] && T[is + 1] && T[is + 1].w && !isQ(i)) {
        var isb = T[is].t === "I" ? "I" : L(is);
        if (/^(have|has|had|am|is|are|was|were|can|could|will|would|should|must|do|does|did|haven't|hasn't|hadn't)$/.test(ia)) fix(is, is + 1, T[is + 1].t + " " + isb, "inversion");
        else if (!/^(hardly|scarcely|no)$/.test(x) && x !== "under" && x !== "at" || x === "no") {
          if (PAST[ia] && !V[ia]) fix(is, is + 1, "did " + isb + " " + PAST[ia], "inversion");
          else if (T3[ia] && !V[ia]) fix(is, is + 1, "does " + isb + " " + T3[ia], "inversion");
          else if (isBase(ia) && x !== "no") fix(is, is + 1, "do " + isb + " " + ia, "inversion");
        }
      }
      if (x === "no" && y === "sooner" || /^(hardly|scarcely)$/.test(x)) {
        for (j = i + 3; j < sEnd[i] && j < n; j++) if (L(j) === (x === "no" ? "when" : "than") && (SUBJ[L(j + 1)] || DET[L(j + 1)])) { fix(j, j, x === "no" ? "than" : "when", "inversion"); break; }
      }
    }
    /* in case / provided that / as long as + will -> present */
    var cw = -1;
    if (x === "case" && L(i - 1) === "in") cw = i + 1;
    else if (/^(provided|providing)$/.test(x) && !BE[L(i - 1)] && !HAVE[L(i - 1)]) cw = y === "that" ? i + 2 : i + 1;
    else if (x === "as" && y === "long" && L(i + 2) === "as") cw = i + 3;
    else if (x === "condition" && L(i - 1) === "on" && y === "that") cw = i + 2;
    if (cw > 0 && SUBJ[L(cw)] && L(cw + 1) === "will" && (isBase(L(cw + 2)) || L(cw + 2) === "be") && !isQ(i)) fix(cw + 1, cw + 2, presentOf(L(cw), L(cw + 2)), "cond-will");
    /* What I need it is -> What I need is; It was my father who he taught me -> who taught me */
    if (x === "what" && i === sStart[i] && !isQ(i)) {
      for (j = i + 2; j <= i + 7 && j < sEnd[i] && !punct(j); j++)
        if (L(j) === "it" && /^(is|was)$/.test(L(j + 1)) && (V[L(j - 1)] || PAST[L(j - 1)] || T3[L(j - 1)]) && !/^(think|thought|know|knew|believe|guess|say|said|mean|meant)$/.test(L(j - 1))) { fix(j, j + 1, T[j + 1].t, "cleft"); break; }
    }
    if (x === "who" && /^(he|she|they)$/.test(y) && L(sStart[i]) === "it" && /^(is|was|'s)$/.test(L(sStart[i] + 1)) && finite(i + 2) && (OBJ[L(i + 3)] || DET[L(i + 3)] || POSS[L(i + 3)]) && !/^(is|was|are|were)$/.test(L(i + 2)))
      fix(i + 1, i + 2, T[i + 2].t, "cleft");
    /* After finish the work -> After finishing; Having finish -> Having finished */
    if (/^(after|before|while)$/.test(x) && isBase(y) && !A[y] && !/ing$/.test(y) && y !== L(i - 1) && (DET[L(i + 2)] || POSS[L(i + 2)] || OBJ[L(i + 2)] || /^(it|some|any|home|to)$/.test(L(i + 2))) && !UNC_SOFT[y] && !UNC_STRICT[y] && !/^(do|have|let|like|love|dark|long|school|work|class|lunch|dinner|breakfast)$/.test(y) && !DET[L(i - 1)] &&
        (!N[y] || DET[L(i + 2)] || OBJ[L(i + 2)] || POSS[L(i + 2)]) && T[i + 1].w && !capMid(i + 1)) fix(i + 1, i + 1, ing(y), "part-clause");
    if (x === "having" && (i === sStart[i] || T[i - 1] && T[i - 1].t === ",") && isBase(y) && part(y) !== y && !UNC_SOFT[y] && (!N[y] || DET[L(i + 2)] || POSS[L(i + 2)] || OBJ[L(i + 2)])) fix(i + 1, i + 1, part(y), "part-clause");
    /* My car needs to repair -> needs to be repaired; He was made do -> made to do; being tell -> being told */
    if (/^(need|needs|needed)$/.test(x) && y === "to" && CAUS_V[L(i + 2)] && !/^(change|develop|take|design|build)$/.test(L(i + 2)) &&
        (N[L(i - 1)] || PL[L(i - 1)] || /^(it|this|that|these|those)$/.test(L(i - 1))) && !PERSON[L(i - 1)] && !KIN[L(i - 1)] && !JOB[L(i - 1)] &&
        (i + 3 >= n || punct(i + 3) || /^(soon|now|today|again|before|urgently|immediately|by|every|at|in|and)$/.test(L(i + 3)))) fix(i + 1, i + 2, "to be " + part(L(i + 2)), "pass-adv");
    if (x === "made" && /^(am|is|are|was|were|be|been|being|get|got)$/.test(L(i - 1)) && isBase(y) && !A[y] && !/^(use|love|sure|up|out|of|into|from|for|by|in)$/.test(y) && T[i + 1].w) fix(i + 1, i + 1, "to " + T[i + 1].t, "pass-adv");
    if (x === "being" && isBase(y) && part(y) !== y && !N[y] && !A[y] && !UNC_SOFT[y] && L(i + 2) !== "-" && !/^(close|cross|open|free|clear|clean|dry|empty|warm|cool|calm|quiet|slow|fine|right|wrong|last|present|content)$/.test(y) && /^(like|likes|liked|hate|hates|hated|love|loves|enjoy|enjoys|avoid|avoided|without|of|about|from|mind|risk|after|before|remember|forget|by)$/.test(L(i - 1))) fix(i + 1, i + 1, part(y), "pass-adv");
    /* It's time we go -> went; I'd rather you don't -> didn't */
    var upv = -1;
    if (x === "time" && SUBJ[y] && /\bit(?:'s| is)(?: high| about)? $/i.test(text.slice(T[sStart[i]].s, T[i].s))) upv = i + 2;
    if (x === "rather" && (L(i - 1) === "would" || /'d$/.test(L(i - 1))) && SUBJ[y] && y !== "i" && !(L(i - 1) === "i'd" && y === "i")) upv = i + 2;
    if (upv > 0 && T[upv] && T[upv].w) {
      var uv = L(upv), usb = L(upv - 1), uto = "";
      if (/^(am|is|are)$/.test(uv)) uto = x === "time" ? BEPAST[usb] : "were";
      else if (/^(don't|doesn't)$/.test(uv)) uto = "didn't";
      else if (uv === "can") uto = "could";
      else if (isBase(uv) && past(uv) !== uv && !N[uv]) uto = past(uv);
      else if (T3[uv] && !V[uv]) uto = past(T3[uv]);
      if (uto) fix(upv, upv, uto, "unreal-past");
    }
    /* can't help to laugh -> laughing; no use to cry -> crying; no point to argue -> in arguing; I'll never forget to meet you -> meeting; I remember to lock ... yesterday -> locking */
    if (x === "help" && /^(can't|cannot|couldn't)$/.test(L(i - 1)) && y === "to" && isBase(L(i + 2))) fix(i, i + 2, "help " + ing(L(i + 2)), "ing-c1");
    if (x === "use" && L(i - 1) === "no" && L(i - 2) !== "of" && y === "to" && isBase(L(i + 2))) fix(i + 1, i + 2, ing(L(i + 2)), "ing-c1", "dia:");
    if (x === "point" && L(i - 1) === "no" && y === "to" && isBase(L(i + 2))) fix(i + 1, i + 2, "in " + ing(L(i + 2)), "ing-c1");
    if (x === "forget" && L(i - 1) === "never" && (/^(will|won't)$/.test(L(i - 2)) || /'ll$/.test(L(i - 2))) && y === "to" && /^(meet|see)$/.test(L(i + 2)) && OBJ[L(i + 3)]) fix(i + 1, i + 2, ing(L(i + 2)), "ing-c1");
    if (x === "remember" && SUBJX[L(i - 1)] && y === "to" && isBase(L(i + 2)) && /\b(yesterday|ago|last (night|week|month|year|time))\b/i.test(text.slice(T[i].e, T[Math.min(sEnd[i], n - 1)].e))) fix(i + 1, i + 2, ing(L(i + 2)), "ing-c1");
    /* I was about to leaving -> leave; on the point to give up -> of giving up; due to landing -> land */
    if (x === "about" && y === "to" && ING[L(i + 2)] && (BE[L(i - 1)] || contrSubj(L(i - 1)))) fix(i + 2, i + 2, ING[L(i + 2)], "fut-past");
    if (/^(point|verge)$/.test(x) && L(i - 1) === "the" && L(i - 2) === "on" && y === "to" && isBase(L(i + 2))) fix(i + 1, i + 2, "of " + ing(L(i + 2)), "fut-past");
    if (x === "due" && y === "to" && BE[L(i - 1)] && /^(landing|arriving|leaving|departing|starting|beginning|opening|closing|finishing|ending|returning)$/.test(L(i + 2)) && (i + 3 >= n || punct(i + 3) || /^(at|on|in|tomorrow|next|soon|this|today)$/.test(L(i + 3))))
      fix(i + 2, i + 2, ING[L(i + 2)], "fut-past");
    if (/^(bound|likely|unlikely|about|due)$/.test(x) && y === "to" && (BE[L(i - 1)] || contrSubj(L(i - 1))) && T3[L(i + 2)] && !V[L(i + 2)] && !N[L(i + 2)]) fix(i + 2, i + 2, T3[L(i + 2)], "fut-past");
    /* In addition to learn -> learning; Besides of that -> Besides that; In the other hand -> On; According to me -> In my opinion */
    if (x === "addition" && L(i - 1) === "in" && y === "to" && isBase(L(i + 2)) && !N[L(i + 2)] && !UNC_SOFT[L(i + 2)]) fix(i + 2, i + 2, ing(L(i + 2)), "discourse");
    if (x === "besides" && i === sStart[i] && isBase(y) && !N[y] && !UNC_SOFT[y] && !A[y]) fix(i + 1, i + 1, ing(y), "discourse");
    if (/^(besides|beside)$/.test(x) && y === "of" && (i === sStart[i] || T[i - 1].t === ",")) fix(i, i + 1, x === "beside" ? cap1("besides").toLowerCase() : T[i].t, "discourse");
    if (x === "in" && y === "the" && L(i + 2) === "other" && L(i + 3) === "hand" && (i === sStart[i] || punct(i - 1)) && T[i + 4] && T[i + 4].t === ",") fix(i, i, "on", "discourse");
    if (x === "according" && y === "to" && (L(i + 2) === "me" || L(i + 2) === "my" && L(i + 3) === "opinion")) fix(i, L(i + 2) === "me" ? i + 2 : i + 3, "in my opinion", "discourse");
    /* I think yes -> I think so; I think no -> I don't think so; I hope no -> I hope not */
    if (/^(think|hope|guess|believe|suppose)$/.test(x) && SUBJX[L(i - 1)] && /^(yes|no)$/.test(y) && (i + 2 >= n || punct(i + 2))) {
      if (y === "yes") fix(i + 1, i + 1, "so", "so-do");
      else if (x === "hope") fix(i + 1, i + 1, "not", "so-do");
      else fix(i, i + 1, "don't " + x + " so", "so-do");
    }

    /* ---------- C2 ---------- */
    /* It is essential that he will be -> he be; They demanded him to leave -> demanded that he leave */
    if (/^(essential|vital|crucial|imperative|necessary|important)$/.test(x) && y === "that" && (/^(is|was|it's|be|been)$/.test(L(i - 1)) || /^(is|was|it's)$/.test(L(i - 2))) &&
        (SUBJ[L(i + 2)] || INDEF[L(i + 2)]) && L(i + 3) === "will" && (isBase(L(i + 4)) || L(i + 4) === "be") && L(i + 5) !== "-")
      fix(i + 3, i + 4, T[i + 4].t, "subjunctive", "alt:should " + T[i + 4].t);
    if (/^(demand|demands|demanded|insist|insists|insisted|propose|proposes|proposed)$/.test(x) && OBJ_SUBJ[y] && y !== "you" && L(i + 2) === "to" && isBase(L(i + 3)))
      fix(i + 1, i + 3, "that " + OBJ_SUBJ[y] + " " + L(i + 3), "subjunctive");
    /* If I had studied, I would have been a doctor now -> would be; If I didn't lose my keys yesterday, I would be -> hadn't lost */
    if (x === "if" && i === sStart[i] && !isQ(i)) {
      var mc = -1;
      for (j = i + 2; j < sEnd[i] && j < n; j++) if (T[j].t === ",") { mc = j; break; }
      if (mc > 0) {
        var ifHad = false, ifPast = /\b(yesterday|ago|last (night|week|month|year|summer|winter|weekend|time))\b/i.test(text.slice(T[i].s, T[mc].s));
        for (j = i + 1; j < mc; j++) if (/^(had|hadn't)$/.test(L(j)) && (PP[L(skipAdv(j + 1))] || L(skipAdv(j + 1)) === "been")) ifHad = true;
        var nowW = /\b(now|today|nowadays|these days)\b/i.test(text.slice(T[mc].e, T[Math.min(sEnd[i], n - 1)].e)) && !/\bby now\b/i.test(text.slice(T[mc].e, T[Math.min(sEnd[i], n - 1)].e));
        for (j = mc + 1; j < sEnd[i] && j < n; j++) if (/^(would|could|might|wouldn't|couldn't)$/.test(L(j)) || /'d$/.test(L(j))) break;
        var mw = j < sEnd[i] && j < n ? j : -1;
        if (mw > 0 && ifHad && nowW && L(mw + 1) === "have" && T[mw + 2] && T[mw + 2].w) {
          var pw2 = L(mw + 2), pb = pw2 === "been" ? "be" : PP[pw2] || PAST[pw2] || "";
          if (pb) fix(mw + 1, mw + 2, pb, "mixed-cond");
        }
        if (mw > 0 && ifPast && !ifHad) {
          for (j = i + 1; j < mc; j++) {
            if (!SUBJ[L(j)] && !(DET[L(j - 1)] && (N[L(j)] || PL[L(j)]))) continue;
            k = L(j + 1);
            if (k === "didn't" && isBase(L(j + 2)) && L(j + 2) !== "be") fix(j + 1, j + 2, "hadn't " + part(L(j + 2)), perfWould(mc, sEnd[i]) ? "third-cond" : "mixed-cond");
            else if (PAST[k] && !V[k] && !BE[k] && !/^(had|could|would|should|might)$/.test(k)) fix(j + 1, j + 1, "had " + part(PAST[k]), perfWould(mc, sEnd[i]) ? "third-cond" : "mixed-cond");
            break;
          }
        }
      }
    }
    /* Not until I got home I noticed -> did I notice; Only by working hard you can -> can you; Not once he said -> did he say; So tired I was that -> was I */
    if (i === sStart[i] && !isQ(i)) {
      var o1 = x === "not" && y === "once" || x === "nowhere" && y !== "near" && y !== "else" ? i + (x === "not" ? 2 : 1) :
        (x === "in" && y === "no" && L(i + 2) === "way" || x === "on" && y === "no" && L(i + 2) === "account") ? i + 3 : -1;
      if (o1 > 0 && SUBJ[L(o1)] && L(o1) !== "it") inv2(o1);
      var oc = x === "not" && y === "until" || x === "only" && /^(when|if|after|by|once|until|with|in|through)$/.test(y) ? i + 2 : -1;
      if (oc > 0) {
        var ocl = /^(when|if|once|until)$/.test(y) || y === "after" && SUBJ[L(i + 2)], ocm = -1, seen = 0;
        for (j = oc; j < sEnd[i] && j < n; j++) if (T[j].t === ",") { ocm = j; break; }
        if (ocm > 0) { if (SUBJ[L(ocm + 1)] && L(ocm + 1) !== "it" && !AUXQ[L(ocm)]) inv2(ocm + 1); }
        else for (j = oc; j < sEnd[i] && j < n; j++) {
          if (!/^(i|he|she|we|they|you)$/.test(L(j)) || !T[j + 1] || !T[j + 1].w) continue;
          if (AUXQ[L(j - 1)] && j - 1 > oc) break; // already "did I ..."
          if (!(finite(j + 1) || isBase(L(j + 1)) || MODAL[L(j + 1)])) continue;
          if (L(j) === "you" && j !== oc && !(N[L(j - 1)] || PL[L(j - 1)] || ADVS[L(j - 1)] || /^(home|hard|there|here|well|again|up|out)$/.test(L(j - 1)))) continue;
          seen++;
          if (seen === (ocl ? 2 : 1)) { inv2(j); break; }
        }
      }
      if (x === "so" && A[y] && !N[y] && SUBJ[L(i + 2)] && L(i + 2) !== "it" && /^(was|were|is|am|are)$/.test(L(i + 3)) && /\bthat\b/i.test(text.slice(T[i + 3].e, T[Math.min(sEnd[i], n - 1)].e)))
        fix(i + 2, i + 3, T[i + 3].t + " " + (T[i + 2].t === "I" ? "I" : L(i + 2)), "inversion2");
    }
    /* Much as I like him, but ... -> no "but"; No matter how much hard -> how hard; Even I studied hard, ... -> Even though */
    if (i === sStart[i] && y === "as" && (x === "much" || x === "try" || A[x] && !N[x]) && (SUBJ[L(i + 2)] || contrSubj(L(i + 2)))) {
      for (j = i + 3; j < sEnd[i] && j < n; j++) if (T[j].t === ",") { if (L(j + 1) === "but" && isWord(j + 2)) fix(j, j + 1, ",", "concession"); break; }
    }
    if (x === "how" && y === "much" && A[L(i + 2)] && !N[L(i + 2)] && !UNC_SOFT[L(i + 2)] && !COMP_OF[L(i + 2)] && !/^(more|less|better|worse|else|good|bad|longer|further|farther|older|extra|enough|much|many)$/.test(L(i + 2)) &&
        !N[L(i + 3)] && !PL[L(i + 3)] && !UNC_SOFT[L(i + 3)] && !UNC_STRICT[L(i + 3)] && !A[L(i + 3)])
      fix(i, i + 1, T[i].t, "concession");
    if (x === "however" && y === "much" && A[L(i + 2)] && !N[L(i + 2)] && !COMP_OF[L(i + 2)] && !/^(more|less|better|worse)$/.test(L(i + 2)) && !N[L(i + 3)] && !PL[L(i + 3)])
      fix(i, i + 1, T[i].t, "concession");
    if (x === "even" && i === sStart[i] && SUBJ[y] && T[i + 2] && T[i + 2].w && finite(i + 2) && !isQ(i)) {
      for (j = i + 3; j < sEnd[i] && j < n; j++) if (T[j].t === ",") { if (SUBJ[L(j + 1)] || DET[L(j + 1)] || POSS[L(j + 1)]) fix(i, i, T[i].t + " though", "concession"); break; }
    }
    /* needn't to go -> needn't go; might as well to -> might as well; may well to -> may well; dare not to -> dare not */
    if ((x === "needn't" || x === "daren't") && y === "to" && isBase(L(i + 2))) fix(i, i + 1, T[i].t, "modal-adv");
    if (/^(need|dare)$/.test(x) && y === "not" && L(i + 2) === "to" && isBase(L(i + 3)) && (SUBJ[L(i - 1)] && !SUBJ3[L(i - 1)])) fix(i + 1, i + 2, "not", "modal-adv");
    if (/^(might|may|could)$/.test(x) && y === "as" && L(i + 2) === "well" && L(i + 3) === "to" && isBase(L(i + 4))) fix(i + 2, i + 3, T[i + 2].t, "modal-adv");
    if (/^(might|may)$/.test(x) && y === "well" && L(i + 2) === "to" && (isBase(L(i + 3)) || L(i + 3) === "be")) fix(i + 1, i + 2, T[i + 1].t, "modal-adv");
    /* The life is short -> Life is short; the poors -> the poor; The rich is -> The rich are */
    if (x === "the" && cs(i) && /^(life|happiness|freedom|education|health|nature|honesty|patience|knowledge|kindness|poverty|unemployment|violence|smoking|jealousy|laziness)$/.test(y) &&
        (/^(is|was|can|makes|made|has|gives|brings|comes|needs|means|should|must|will)$/.test(L(i + 2))) && !quoted(i))
      fix(i, i + 1, T[i + 1].t, "art-adv");
    var PPL_ADJ = /^(rich|poor|elderly|homeless|unemployed|disabled|wealthy|sick|blind|deaf|injured)$/;
    if (x === "the" && /^(poors|richs|riches|elderlies|homelesses|unemployeds|disableds|wealthies|sicks|deafs|injureds)$/.test(y) && !(y === "riches" && !/^(help|helping|helps|helped|for|to|and)$/.test(L(i - 1))))
      fix(i + 1, i + 1, T[i + 1].t.replace(/ies$/, "y").replace(/es$/, "").replace(/s$/, ""), "art-adv");
    if (x === "the" && cs(i) && PPL_ADJ.test(y) && /^(is|was|has)$/.test(L(i + 2)) && T[i + 3] && T[i + 3].w)
      fix(i + 2, i + 2, { is: "are", was: "were", has: "have" }[L(i + 2)], "art-adv");
    /* emphasize on -> emphasize; mention about; contact with; resemble to; describe about; attended to the meeting; approached to; comprises of; cope up with */
    var npNext = T[i + 2] && T[i + 2].w && !NUMW[L(i + 2)];
    if (/^(emphasize|emphasizes|emphasized|emphasizing|emphasise|emphasises|emphasised|emphasising)$/.test(x) && y === "on" && npNext) fix(i, i + 1, T[i].t, "verb-noprep");
    if (/^(mention|mentions|mentioned|mentioning)$/.test(x) && y === "about" && npNext && !DET[L(i - 1)] && L(i - 1) !== "no") fix(i, i + 1, T[i].t, "verb-noprep");
    if (/^(describe|describes|described|describing)$/.test(x) && y === "about" && npNext && !/^(approximately)$/.test(L(i + 2))) fix(i, i + 1, T[i].t, "verb-noprep");
    if (/^(resemble|resembles|resembled|resembling)$/.test(x) && y === "to") fix(i, i + 1, T[i].t, "verb-noprep");
    if ((x === "contacted" || x === "contact" && (/^(please|to|will|can|could|should|must|would|don't|didn't|i|you|we|they)$/.test(L(i - 1)) || /'ll$/.test(L(i - 1)))) && y === "with" && (OBJ[L(i + 2)] || DET[L(i + 2)] || POSS[L(i + 2)])) fix(i, i + 1, T[i].t, "verb-noprep");
    if (/^(attend|attends|attended|attending)$/.test(x) && y === "to" && (DET[L(i + 2)] || POSS[L(i + 2)]) && /^(meeting|meetings|class|classes|conference|lecture|lectures|wedding|party|course|ceremony|concert|funeral|school|university|seminar|workshop|session|event)$/.test(L(i + 3)))
      fix(i, i + 1, T[i].t, "verb-noprep");
    if (x === "approached" && y === "to" && (DET[L(i + 2)] || POSS[L(i + 2)] || OBJ[L(i + 2)])) fix(i, i + 1, T[i].t, "verb-noprep");
    if ((/^(comprise|comprises)$/.test(x) || x === "comprised" && SUBJ[L(i - 1)]) && y === "of" && !BE[L(i - 1)] && !HAVE[L(i - 1)]) fix(i, i + 1, T[i].t, "verb-noprep", "alt:" + { comprise: "consist", comprises: "consists", comprised: "consisted" }[x] + " of");
    if (/^(cope|copes|coped|coping)$/.test(x) && y === "up" && L(i + 2) === "with") fix(i, i + 1, T[i].t, "verb-noprep");
    /* the man to who I spoke -> to whom; the house in that I grew up -> in which; , both of them are -> both of whom; , what surprised -> which */
    if (x === "who" && /^(to|with|for|from|by)$/.test(L(i - 1)) && /^(i|he|she|we|they|you)$/.test(y) && (PERSON[L(i - 2)] || KIN[L(i - 2)] || JOB[L(i - 2)] || /^(someone|somebody|anyone|men|women|people)$/.test(L(i - 2))) && !isQ(i))
      fix(i, i, "whom", "rel-adv");
    if (x === "that" && /^(in|on|at|with|for|to|from|about|under)$/.test(L(i - 1)) && /^(i|he|she|we|they)$/.test(y) && (N[L(i - 2)] || PL[L(i - 2)]) && !A[L(i - 2)] &&
        (DET[L(i - 3)] || POSS[L(i - 3)] || A[L(i - 3)]) && (finite(i + 2) || isBase(L(i + 2))) && L(i - 2) !== "way")
      fix(i, i, PERSON[L(i - 2)] || KIN[L(i - 2)] || JOB[L(i - 2)] ? "whom" : "which", "rel-adv");
    if (x === "of" && y === "them" && T[i - 2] && T[i - 2].t === "," && /^(both|all|most|some|many|none|neither|each|several|few|one|two|three|half)$/.test(L(i - 1)) && finite(i + 2) && i - 2 > sStart[i] + 2 && PL[L(i - 3)] && !OBJ[L(i - 3)]) {
      var who2 = false;
      for (j = i - 3; j >= sStart[i] && j >= i - 6; j--) { var wj = L(j), sg = PL[wj] || wj; if (PERSON[wj] || KIN[sg] || JOB[sg] || PERSON[sg]) { who2 = true; break; } }
      fix(i + 1, i + 1, who2 ? "whom" : "which", "rel-adv");
    }
    if (x === "what" && T[i - 1] && T[i - 1].t === "," && i - 1 > sStart[i] + 2 && !isQ(i) && /^(surprised|surprises|annoyed|annoys|made|makes|meant|means|shocked|upset|upsets|pleased|worried|angered|amazed|amazes|showed|shows|proves|proved)$/.test(y) && !quoted(i) &&
        !/\b(ask|asked|asks|wonder|wondered|know|knew|tell|told|said|say|says|explain|explained)\b/i.test(text.slice(T[sStart[i]].s, T[i].s)))
      fix(i, i, "which", "rel-adv");
    /* The more you read, more you learn -> the more; twice bigger than -> twice as big as */
    if (x === "the" && i === sStart[i] && (COMP_OF[y] || /^(more|less|better|worse|fewer|further|farther|sooner|later)$/.test(y))) {
      for (j = i + 2; j < sEnd[i] && j < n; j++) if (T[j].t === ",") { k = L(j + 1); if ((COMP_OF[k] || /^(more|less|better|worse|fewer)$/.test(k)) && T[j + 2] && T[j + 2].w) fix(j + 1, j + 1, "the " + T[j + 1].t, "comp-adv"); break; }
    }
    if (x === "twice") {
      var tb = COMP_OF[y] || { better: "good", worse: "bad" }[y] || "", tj = i + 2;
      if (!tb && y === "more" && A[L(i + 2)] && !N[L(i + 2)]) { tb = L(i + 2); tj = i + 3; }
      if (tb && L(tj) === "than") fix(i + 1, tj, "as " + tb + " as", "comp-adv");
    }
    /* She does knows -> does know; I did saw -> did see */
    if (/^(do|does|did)$/.test(x) && SUBJ[L(i - 1)] && cs(i - 1) && !isQ(i)) {
      j = skipAdv(i + 1); if (/^(really|certainly|actually|indeed|definitely)$/.test(L(j))) j++;
      k = L(j);
      if (T[j] && T[j].w && !capMid(j)) {
        if (x === "did" && PAST[k] && PAST[k] !== k && (!V[k] || OBJ[L(j + 1)] || DET[L(j + 1)] || POSS[L(j + 1)]) && !N[k]) fix(j, j, PAST[k], "emphasis");
        else if (x === "did" && k === "saw" && (OBJ[L(j + 1)] || DET[L(j + 1)] || POSS[L(j + 1)])) fix(j, j, "see", "emphasis");
        else if (x !== "did" && T3[k] && !V[k] && (!PL[k] || /^(works|loves|likes|needs|wants|knows|cares|tries|means|helps|thinks|hates)$/.test(k))) fix(j, j, T3[k], "emphasis");
      }
    }
  }

  /* question tags (B1): "You are a student, isn't it?" -> "aren't you?" */
  var NEG_AUX = map("am:aren't is:isn't are:aren't was:wasn't were:weren't do:don't does:doesn't did:didn't have:haven't has:hasn't had:hadn't " +
    "can:can't could:couldn't will:won't would:wouldn't shall:shan't should:shouldn't must:mustn't might:mightn't");
  var POS_AUX = Object.create(null); Object.keys(NEG_AUX).forEach(function (a) { if (a !== "am") POS_AUX[NEG_AUX[a]] = a; });
  POS_AUX["cannot"] = "can";
  for (i = 1; i < n; i++) {
    if (T[i].t !== "," || !isQ(i)) continue;
    var tq = i + 1, tEnd = i + 2, tA = L(tq), tP = L(tq + 1);
    if (tA === "am" && tP === "not" && L(tq + 2) === "i") { tEnd = tq + 2; tP = "i"; }
    if (!(NEG_AUX[tA] || POS_AUX[tA]) || !/^(i|you|he|she|it|we|they)$/.test(tP) || !T[tEnd + 1] || T[tEnd + 1].t !== "?" || tEnd + 1 !== sEnd[i]) continue;
    var s0 = sStart[i], okc = true;
    for (k = s0; k < i; k++) if (T[k].t === "," || CONJ[L(k)] && k > s0) okc = false;
    if (!okc || i - s0 < 2) continue;
    var sw = L(s0), sb = "", ax = -1, aux = "", neg = false;
    var cm = /^(i|you|he|she|it|we|they)'(m|re|s|ve|ll)$/.exec(sw);
    if (cm) { sb = cm[1]; aux = { m: "am", re: "are", s: "is", ve: "have", ll: "will" }[cm[2]]; ax = s0 + 1;
      if (cm[2] === "s" && PP[L(skipAdv(s0 + 1))] && !A[L(skipAdv(s0 + 1))] && !ING[L(skipAdv(s0 + 1))]) aux = "has"; }
    else if (SUBJ[sw]) { sb = sw; ax = s0 + 1; }
    else if (/^(this|that)$/.test(sw) && /^(is|was|isn't|wasn't)$/.test(L(s0 + 1))) { sb = "it"; ax = s0 + 1; }
    else continue;
    j = ax; while (j < i && (ADVS[L(j)] || /^(never|hardly|not)$/.test(L(j)))) { if (/^(never|hardly|not)$/.test(L(j))) neg = true; j++; }
    if (!aux) {
      k = L(j);
      if (NEG_AUX[k]) aux = k; else if (POS_AUX[k]) { aux = POS_AUX[k]; neg = true; }
      else if (isBase(k)) aux = "do"; else if (T3[k] && !V[k]) aux = "does"; else if (PAST[k] && !V[k]) aux = "did";
      else continue;
      if (NEG_AUX[k] && L(j + 1) === "not") neg = true;
      if (/^(have|has|had)$/.test(aux) && NEG_AUX[k] && !PP[L(skipAdv(j + 1))] && L(j + 1) !== "got") continue; // "You have a car, don't you / haven't you"
    } else if (L(j) === "not") neg = true;
    // keep the tag's own sign ("You did it, did you?" is fine); only "isn't it" after another subject takes the opposite sign
    var userNeg = !!POS_AUX[tA] || tEnd === tq + 2, itTag = tP === "it" && /^(is|isn't)$/.test(tA) && sb !== "it";
    if (tP !== sb && !itTag || /^(will|would|won't|wouldn't)$/.test(tA) && !/^(will|would)$/.test(aux)) continue;
    var tagNeg = itTag || neg && userNeg ? !neg : userNeg;   // a negative sentence never takes a negative tag
    var wantA = !tagNeg ? aux : sb === "i" && aux === "am" ? "aren't" : NEG_AUX[aux];
    var altA = /^(have|has)$/.test(aux) && L(j) === "got" ? (SUBJ3[sb] ? "does" : "do") : aux === "has" && cm ? "is" :   // AmE "You've got …, don't you?"; "She's done" = finished
      aux === "did" && SAMEPAST[L(j)] || aux === "do" && SAMEPAST[L(j)] || aux === "does" && SAMEPAST[L(j)] ? (aux === "did" ? (SUBJ3[sb] ? "does" : "do") : "did") : "";
    if (altA && tA === (!tagNeg ? altA : NEG_AUX[altA]) && tP === sb && tEnd === tq + 1) continue;
    if (tA !== wantA || tP !== sb || tEnd !== tq + 1) fix(tq, tEnd, wantA + " " + (sb === "i" ? "I" : sb), "q-tag");
  }


  /* So am I / Neither do I (C1): the helper verb comes from the sentence before */
  for (i = 1; i < n; i++) {
    if (i !== sStart[i] || !/^(so|neither|nor|me)$/.test(L(i))) continue;
    var pe = i - 1, ps = sStart[pe];
    if (!stop(pe) || pe - ps < 2) continue;
    var e2 = sEnd[i], seg = [];
    for (k = i; k < e2 && k < n; k++) seg.push(L(k));
    var pw = L(ps), psb = "", pa = "", pneg = false, pj;
    var pcm = /^(i|you|he|she|it|we|they)'(m|re|s|ve|ll)$/.exec(pw);
    if (pcm) { psb = pcm[1]; pa = { m: "am", re: "are", s: "is", ve: "have", ll: "will" }[pcm[2]]; pj = ps + 1; }
    else if (SUBJ[pw]) { psb = pw; pj = ps + 1; } else continue;
    while (pj < pe && (ADVS[L(pj)] || /^(never|not)$/.test(L(pj)))) { if (/^(never|not)$/.test(L(pj))) pneg = true; pj++; }
    if (!pa) {
      k = L(pj);
      if (NEG_AUX[k]) pa = k; else if (POS_AUX[k]) { pa = POS_AUX[k]; pneg = true; }
      else if (isBase(k)) pa = "do"; else if (T3[k] && !V[k]) pa = "does"; else if (PAST[k] && !V[k]) pa = "did";
      else continue;
      if (L(pj + 1) === "not") pneg = true;
      if (/^(have|has|had)$/.test(pa) && !PP[L(skipAdv(pj + 1))] && L(pj + 1) !== "got" && !pneg) pa = pa === "had" ? "did" : pa === "has" ? "does" : "do";
    } else if (L(pj) === "not") pneg = true;
    if (seg[0] === "me") { // "I don't like fish." "Me too." -> "Me neither."
      if (seg.length === 2 && seg[1] === "too" && pneg) fix(i + 1, i + 1, "neither", "so-do");
      continue;
    }
    var nsb = "", na = "", ai;
    if (seg.length === 3 && SUBJ[seg[2]]) { nsb = seg[2]; na = seg[1]; ai = i + 1; }
    else if (seg.length === 3 && SUBJ[seg[1]] && seg[0] !== "so") { nsb = seg[1]; na = seg[2]; ai = -1; }
    else continue;
    if (!(NEG_AUX[na] || POS_AUX[na])) continue;
    var want2 = pa;
    if (/^(am|is|are)$/.test(pa)) want2 = BE3[nsb]; else if (/^(was|were)$/.test(pa)) want2 = BEPAST[nsb];
    else if (/^(do|does)$/.test(pa)) want2 = SUBJ3[nsb] ? "does" : "do"; else if (/^(have|has)$/.test(pa)) want2 = SUBJ3[nsb] ? "has" : "have";
    var nsbT = nsb === "i" ? "I" : nsb;
    var word = pneg ? (seg[0] === "so" ? "neither" : T[i].t) : "so";
    if (ai < 0) fix(i, i + 2, word + " " + want2 + " " + nsbT, "so-do");
    else if (na !== want2 || (seg[0] === "so") === pneg) fix(i, i + 1, word + " " + want2, "so-do");
  }

  /* yesterday / last week / ago: present -> past (in the clause that has the time word) */
  for (i = 0; i < n; i++) {
    x = L(i);
    var mark = x === "yesterday" || x === "ago" || x === "last" && /^(night|week|month|year|summer|winter|spring|autumn|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(L(i + 1));
    if (!mark) continue;
    var a0 = i, b0 = i;
    while (a0 > sStart[i] && !(punct(a0 - 1) && T[a0 - 1].t !== "'") && !CONJ[L(a0 - 1)] && !WH[L(a0 - 1)]) a0--;
    while (b0 < sEnd[i] && !(punct(b0 + 1) && T[b0 + 1].t !== "'") && !CONJ[L(b0 + 1)]) b0++;
    if (/^(of|since|from|about|as|than|like|until|till|before|after)$/.test(L(i - 1)) || x === "last" && /^(of|since|from|about|as|than|like|until|till|before|after)$/.test(L(i - 1))) continue;
    if (a0 === sStart[i] && i <= a0 + 1 && (T[i + 1] && T[i + 1].t === "," || x !== "ago" && i === a0 && L(i + 1) === "night")) { // "Yesterday, I go ..."
      var c = b0 + 1; if (T[c] && T[c].t === ",") { c++; b0 = c; while (b0 < sEnd[i] && !punct(b0 + 1) && !CONJ[L(b0 + 1)]) b0++; }
    }
    if (/\b(today|now|tonight|this (morning|afternoon|evening|week|year))\b/i.test(text.slice(T[a0].s, T[b0].e))) continue;
    var pjs = [];
    if (i > a0 + 1) for (j = i - 1; j >= a0; j--) pjs.push(j); else for (j = a0; j <= b0; j++) pjs.push(j);
    for (var pq = 0; pq < pjs.length; pq++) {
      j = pjs[pq];
      if (!SUBJ[L(j)] || (L(j) === "it" || L(j) === "you") && !(j === a0 || punct(j - 1) || /^(yesterday|ago|night|week|month|year|weekend)$/.test(L(j - 1))) && !(i > a0 + 1 && (finite(skipAdv(j + 1)) || isBase(L(skipAdv(j + 1)))))) continue;
      k = skipAdv(j + 1); y = L(k);
      if (!T[k] || !T[k].w) continue;
      if (i > a0 + 1) { var pastIn = false; for (var pk = k + 1; pk < i; pk++) if (PAST[L(pk)] && !V[L(pk)] || /^(was|were|had|did)$/.test(L(pk))) pastIn = true; if (pastIn) break; }
      if (/^(sound|sounds|look|looks|appear|appears)$/.test(y) || /'d$/.test(L(j - 1)) || /^(let|make|made|help|helped|see|saw|watch|watched|hear|heard|have)$/.test(L(j - 1))) break;
      if (/^(know|knows|think|thinks|believe|believes|hope|hopes|guess|remember|remembers|say|says|assume|suppose|wish|wishes|understand|understands|mean|means|hear|hears|seem|seems|see|sees|bet|feel|feels|mind|forget|imagine|doubt|realize|realise|admit|agree|tell|promise|swear)$/.test(y) && !/^(yesterday|ago|night|week|month|year)$/.test(L(j - 1))) break;
      if (isBase(y) && !SAMEPAST[y] && !PAST[y] && !AUXQ[L(j - 1)]) fix(k, k, past(y), "past-time");
      else if (T3[y] && !V[y]) fix(k, k, past(T3[y]), "past-time");
      else if (/^(am|is|are)$/.test(y) && k === j + 1 && !ING[L(k + 1)]) fix(k, k, BEPAST[L(j)], "past-time");
      break;
    }
  }

  /* collocations: "do a mistake" -> "make a mistake", "strong rain" -> "heavy rain", "open the light" -> "turn on the light" */
  function coForm(v, f) { var w = v.split(" "), b = w[0]; b = f === "s" ? third(b) : f === "p" ? past(b) : f === "q" ? part(b) : f === "g" ? ing(b) : b; return [b].concat(w.slice(1)).join(" "); }
  function coEnd(j, x) { var w = L(j); return j >= n || punct(j) && T[j].t !== "'" && T[j].t !== "-" || !!(CO_NEXT[w] || ADVS[w] || /ly$/.test(w) && !N[w]) && !(x && (" " + x + " ").indexOf(" " + w + " ") >= 0); }
  function coNoun(j, list) { // index after the noun at j, or -1
    var w = L(j), m = list.indexOf(" " + w + "_"), k;
    if (m >= 0 && (k = list.slice(m + 1).split(" ")[0].split("_")) && L(j + 1) === k[1]) return j + 2;
    return list.indexOf(" " + w + " ") >= 0 && !(/^[A-Z][a-z]/.test(T[j].t) && capMid(j)) ? j + 1 : -1;
  }
  function coSay(cf, ce, a, b) { var e = edits[edits.length - 1]; if (e && e.rule === "colloc" && e.s === T[a].s) { e.cf = cf; e.ce = ce; } }
  for (i = 0; i < n; i++) {
    x = L(i);
    if (!T[i].w || capMid(i) && /^[A-Z][a-z]/.test(T[i].t)) continue;
    var cv = COV[x];
    if (cv) CO_VN.forEach(function (r) {
      if ((" " + r[0] + " ").indexOf(" " + cv[0] + " ") < 0) return;
      var ex = r[6] || {}, list = " " + r[2] + " ", j = i + 1, e2 = -1, c = 0, f = cv[1];
      if (L(i - 1) === "-") return;
      if (cv[0] === "do" && /^(b|s|p)$/.test(f)) {   // helper do: "Do friends matter?", "so do I", "than I do my friends", "what Tom did", "it does attempt"
        if (WH[L(i - 1)] || /^(so|neither|nor|as|than)$/.test(L(i - 1)) || /^(as|than)$/.test(L(i - 2)) || isQ(i) && cs(i) || V[L(i + 1)] || /^(attempt|offer|promise|request|comment|mess|progress)$/.test(L(i + 1))) return;
        for (var q0 = Math.max(sStart[i], i - 3); q0 < i; q0++) if (L(q0) === "what") return;
        if (isQ(i)) for (q0 = i - 1; q0 >= sStart[i] && !/^(if|when|because|and|but|that|before|after|unless|,)$/.test(L(q0)) && T[q0].t !== ","; q0--) if (WH[L(q0)]) return;
      }
      if (ex.me) { var me = false; for (var q = Math.max(sStart[i], i - 4); q < i; q++) if (/^(i|we)$/.test(L(q))) me = true; if (!me) return; }
      if (/^(do|make|tell)$/.test(r[1]) && (OBJ[L(j)] && L(j) !== "you" || L(j) === "you" && cv[0] !== "do")) j++;   // "make me a favor", "say me a story"
      var d = r[3], w0 = L(j);
      if (d === "0") e2 = coNoun(j, list);
      else if (d === "a!") {
        if (/^(a|an)$/.test(w0)) { j++; while (c < 2 && (A[L(j)] || A2[L(j)]) && !/^(clean|complete|fresh|sharp|total|final|lucky|big)$/.test(L(j)) && coNoun(j, list) < 0) { j++; c++; } e2 = coNoun(j, list); }
      }
      else if (d === "d") { if (DET[w0] || POSS[w0]) { j++; while (c < 2 && (A[L(j)] || A2[L(j)]) && coNoun(j, list) < 0) { j++; c++; } e2 = coNoun(j, list); } }
      else if (d === "the") e2 = w0 === "the" ? coNoun(j + 1, list) : -1;
      else if (d === "poss") e2 = POSS[w0] ? coNoun(j + 1, list) : -1;
      else if (d === "a" || d === "a0") {
        if (w0 === "a" || w0 === "an") { j++; while (c < 2 && (A[L(j)] || A2[L(j)] || L(j) === "very") && coNoun(j, list) < 0) { j++; c++; } e2 = coNoun(j, list); }
        else if (d === "a0") {
          var qn = j;   // adjectives only after a quantity: "make some nice photos", but "make realistic photos" (create) is fine
          if (/^(lots|lot)$/.test(L(j)) && L(j + 1) === "of") j += 2;
          else if (/^(some|many|more|few|several|two|three|four|five|ten|twenty|hundreds|dozens)$/.test(L(j)) || T[j] && T[j].d) { j++; if (L(j) === "of") j++; }
          while (j > qn && c < 2 && (A[L(j)] || A2[L(j)]) && coNoun(j, list) < 0) { j++; c++; }
          e2 = coNoun(j, list);
        }
      } else {
        var adj = false;
        while (c < 4 && coNoun(j, list) < 0 && isWord(j) && L(j) !== "that" && !/^(sure|certain)$/.test(L(j)) && !(adj && (DET[L(j)] || POSS[L(j)])) &&
          (DET[L(j)] || POSS[L(j)] || CO_QTY[L(j)] || NUMW[L(j)] || T[j].d || ADVS[L(j)] || A[L(j)] || A2[L(j)] || N2[L(j)] && !V[L(j)] || /'s$/.test(L(j)) && N2[L(j).slice(0, -2)] ||
          L(j) === "of" && /^(lot|lots|couple|one|some|many|few|most|all|none|plenty|number|any|each)$/.test(L(j - 1)))) { if (A[L(j)] || A2[L(j)] || N2[L(j)]) adj = true; j++; c++; }
        e2 = coNoun(j, list);
      }
      if (e2 < 0 || !coEnd(e2, ex.x)) return;
      if (f === "p" && past(cv[0]) === part(cv[0])) { var k2 = i - 1; while (k2 >= 0 && (ADVS[L(k2)] || L(k2) === "not")) k2--; if (HAVE[L(k2)] || /'ve$/.test(L(k2)) || /^(was|were|is|are|am|be|been|being|get|got|gets)$/.test(L(k2))) f = "q"; }
      var to = coForm(r[1], f), np = text.slice(T[i].e, T[e2 - 1].e);
      fix(i, i, to, "colloc", ex.alt ? "alt:" + coForm(ex.alt, f) : "");
      coSay("در انگلیسی می‌گوییم **" + to + np + "**. " + r[4], "“" + to + np + "”, not “" + T[i].t + np + "”: " + r[5] + ".", i, e2 - 1);
    });
    CO_AN.forEach(function (r) {
      if (x !== r[0] || (" " + r[2] + " ").indexOf(" " + L(i + 1) + " ") < 0 || !isWord(i + 1) || N2[L(i + 2)] && !CO_NEXT[L(i + 2)] || L(i + 2) === "-" || L(i - 1) === "-") return;
      fix(i, i, r[1], "colloc", r[5] ? "alt:" + r[5] : "");
      coSay("در انگلیسی می‌گوییم **" + r[1] + " " + T[i + 1].t + "**. " + r[3], "“" + r[1] + " " + T[i + 1].t + "”, not “" + T[i].t + " " + T[i + 1].t + "”: " + r[4] + ".", i, i + 1);
    });
    /* go to a trip -> go on a trip; with car -> by car */
    if (x === "to" && GO[L(i - 1)] && /^(go|goes|went|gone|going)$/.test(L(i - 1))) {
      j = i + 1; c = 0;
      while (c < 3 && !CO_GO[L(j)] && (DET[L(j)] || POSS[L(j)] || A[L(j)] || A2[L(j)] || N2[L(j)] && !V[L(j)] || T[j] && T[j].d || NUMW[L(j)])) { j++; c++; }
      if (CO_GO[L(j)] && coEnd(j + 1) && L(i + 1) !== "the" && !(c === 0 && /^(trip|tour|journey|picnic|cruise|excursion)$/.test(L(j)))) {
        fix(i, i, "on", "colloc");
        coSay("در انگلیسی می‌گوییم **" + T[i - 1].t + " on" + text.slice(T[i].e, T[j].e) + "**. برای سفر و تعطیلات و پیک‌نیک go on می‌آید: go on a trip، go on holiday.", "“go on a trip / holiday / vacation”, not “go to”.", i, j);
      }
    }
    if (x === "with" && CO_BY[L(i + 1)] && coEnd(i + 2) && !/^(the|a|an)$/.test(L(i - 1))) {
      fix(i, i, "by", "colloc");
      coSay("در انگلیسی می‌گوییم **by " + T[i + 1].t + "**. برای وسیله‌ی نقلیه by + اسم بدون a / the می‌آید: by car، by bus (یا in my car، on the bus).", "“by car / by bus”, not “with car”.", i, i + 1);
    }
  }

  /* old and dialect English: notes, not errors */
  var notes = [], oldS = Object.create(null), sOf = Object.create(null);
  for (i = 0; i < n; i++) sOf[T[i].s] = sStart[i];
  function onote(a, b, to, why, soft) {
    var from = text.slice(T[a].s, T[b].e);
    if (/^'?[A-Z]/.test(from) && !/^[A-Z]/.test(to)) to = cap1(to);
    notes.push({ s: T[a].s, e: T[b].e, from: from, to: to, rule: "old", why: why, old: 1 });
    if (!soft) oldS[sStart[a]] = 1;
  }
  for (i = 0; i < n; i++) {
    if (!T[i].w) continue;
    x = L(i);
    if (x === "needs" && L(i - 1) === "must") { onote(i - 1, i, "must", "must needs یعنی «ناچار باید» (قدیمی). امروزه فقط must.", 1); continue; }
    if (x === "art" && L(i + 1) === "thou") { onote(i, i + 1, "are you", "art thou = are you (سؤال). " + OLD_W.thou[1]); i++; continue; }
    if (x === "wilt" && L(i + 1) === "thou") { onote(i, i + 1, "will you", "wilt thou = will you. " + OLD_W.thou[1]); i++; continue; }
    var nxA = T[i + 1] && T[i + 1].t === "'" && T[i + 1].s === T[i].e && !(T[i + 2] && T[i + 2].w && T[i + 2].s === T[i + 1].e);
    var pvA = T[i - 1] && T[i - 1].t === "'" && T[i - 1].e === T[i].s && !(T[i - 2] && T[i - 2].w && T[i - 2].e === T[i - 1].s);
    var oa = OLD_AP[x], oc = OLD_CUT[x], ow = OLD_W[x];
    if (pvA && oa) { onote(i - 1, i, oa[0], oa[1]); continue; }
    if (nxA && oc && !(x === "i" && T[i].t === "I")) { onote(i, i + 1, oc[0], oc[1]); continue; }
    if (nxA && x.length > 3 && /in$/.test(x) && (ING[x + "g"] || /^(nothin|somethin|anythin|everythin|mornin|evenin|darlin)$/.test(x))) {
      onote(i, i + 1, T[i].t + "g", "حذف g آخر (goin' به جای going) تلفظ محاوره‌ای است؛ در نوشتن ‎-ing کامل می‌آید."); notes[notes.length - 1].sp = 1; continue;
    }
    if (ow && !(x === "ye" && !/^[Yy]e$/.test(T[i].t))) {
      var oto = ow[0];
      if (x === "ain't" || x === "hain't") {
        var ap = L(i - 1), pp2 = PP[L(skipAdv(i + 1))] || /^(been|got)$/.test(L(skipAdv(i + 1)));
        oto = pp2 ? (SUBJ3[ap] || x === "hain't" && SUBJ3[ap] ? "hasn't" : "haven't") : ap === "i" ? "am not" : SUBJ3[ap] || ap === "that" || ap === "this" || ap === "there" ? "isn't" : "aren't";
      }
      if (x === "agin") oto = OBJ[L(i + 1)] || DET[L(i + 1)] || POSS[L(i + 1)] || L(i + 1) === "it" ? "against" : "again";
      if (L(i + 1) === "thou" && x !== "thou" && x !== "thee" && x !== "thy") { onote(i, i + 1, oto + " you", ow[1] + " " + OLD_W.thou[1]); i++; continue; }
      if (x === "thou" && /^(art|wilt)$/.test(L(i + 1))) { onote(i, i + 1, "you " + (L(i + 1) === "art" ? "are" : "will"), ow[1]); i++; continue; }
      if (x === "thou" && T[i + 1] && /(e?st)$/.test(L(i + 1)) && !OLD_W[L(i + 1)]) {
        var tb = L(i + 1).replace(/est$/, ""), tb2 = L(i + 1).replace(/st$/, "");
        tb = V[tb] ? tb : V[tb2] ? tb2 : tb.replace(/(.)\1$/, "$1");
        if (V[tb]) { onote(i, i + 1, "you " + tb, ow[1]); i++; continue; }
      }
      onote(i, i, /^[A-Z]/.test(T[i].t) ? cap1(oto) : oto, ow[1], ow[2]);
      continue;
    }
    if (x.length > 4 && /eth$/.test(x) && !N[x] && !A[x]) {  // goeth, maketh, speaketh
      var eb = V[x.slice(0, -3)] ? x.slice(0, -3) : V[x.slice(0, -2)] ? x.slice(0, -2) : "";
      if (eb) onote(i, i, third(eb), "پسوند ‎-eth شکل قدیمی ‎-s سوم‌شخص است (he goeth = he goes).");
    }
  }

  /* keep the first fix where two overlap */
  edits.sort(function (a, b) { return a.s - b.s || b.e - a.e || (a.rule === "apos") - (b.rule === "apos") || (b.rule === "past-time") - (a.rule === "past-time"); });
  var out = [], last = -1;
  edits.forEach(function (e) {
    if (e.s < last) return;
    var on = null; notes.forEach(function (o) { if (e.s < o.e && o.s < e.e) on = o; });
    if (on) { if (on.sp && e.s === on.s) { on.to = e.to; on.why += " " + (MSG[e.rule] || [""])[0]; } return; }   // the old word already has its note
    last = e.e;
    if (/^dia:/.test(e.why)) { e.why = ""; e.dia = 1; }
    if (/^note:/.test(e.why)) { e.why = e.why.slice(5); e.old = 1; notes.push(e); }
    else if (oldS[sOf[e.s]]) { e.old = 2; notes.push(e); }   // a sentence in old or dialect English: say today's form, but not as an error
    else out.push(e);
  });
  var fixed = "", pos = 0;
  out.forEach(function (e) { fixed += text.slice(pos, e.s) + e.to; pos = e.e; });
  fixed += text.slice(pos);
  function msg(e) { var m = MSG[e.rule] || ["", "", ""]; e.fa = e.cf || m[0]; e.en = e.ce || m[1]; e.lesson = m[2]; if (DIA[e.rule] && !e.old) e.dia = 1; delete e.cf; delete e.ce; }
  out.forEach(msg); notes.forEach(msg);
  notes.sort(function (a, b) { return a.s - b.s; });
  var today = "", tp = 0;
  notes.concat(out).sort(function (a, b) { return a.s - b.s; }).forEach(function (o) { if (o.s >= tp) { today += text.slice(tp, o.s) + o.to; tp = o.e; } });
  return { text: text, fixed: fixed, issues: out, notes: notes, today: notes.length ? today + text.slice(tp) : "" };
}

var API = { init: init, check: check, messages: MSG, isReady: function () { return ready; }, _: { third: third, past: past, part: part, ing: ing, plural: plural, comp: comp, article: article } };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.VZ_GRAMMAR = API;
})(this);
