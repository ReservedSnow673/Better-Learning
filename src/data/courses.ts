import type { Citation, CoursePack, Lesson } from '../contracts'

const sourceUrls = {
  marcus: 'https://www.gutenberg.org/ebooks/2680',
  leonardo: 'https://www.gutenberg.org/ebooks/5000',
  sun: 'https://www.gutenberg.org/ebooks/132',
}

function citation(
  thinker: keyof typeof sourceUrls,
  documentTitle: string,
  anchor: string,
  quote: string,
  attribution: Citation['attribution'] = 'author',
): Citation {
  return {
    id: `${thinker}-${anchor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    documentId: thinker,
    documentTitle,
    anchor,
    quote,
    sourceUrl: sourceUrls[thinker],
    localPath: `/sources/${thinker === 'marcus' ? 'meditations' : thinker === 'leonardo' ? 'leonardo-notebooks' : 'art-of-war'}.txt`,
    attribution,
  }
}

function lesson(
  number: number,
  title: string,
  eyebrow: string,
  objective: string,
  passage: string,
  explanation: string,
  applicationTitle: string,
  scenario: string,
  steps: string[],
  prompt: string,
  guidance: string,
  reflection: string,
  citations: Citation[],
): Lesson {
  return {
    id: `lesson-${number}`,
    number,
    title,
    eyebrow,
    durationMinutes: 12 + (number % 3) * 3,
    objective,
    passage,
    explanation,
    application: { title: applicationTitle, scenario, steps },
    exercise: { prompt, guidance, reflection },
    citations,
  }
}

const marcusTitle = 'Meditations'
const marcusLessons: Lesson[] = [
  lesson(
    1,
    'Begin where you are',
    'Attention before ambition',
    'Notice where your attention is going and return it to the action in front of you.',
    '“It is high time for thee to understand the true nature both of the world, whereof thou art a part.”',
    'Marcus writes to himself, not to an audience. The urgency is practical: a life becomes coherent one act at a time. Attention is the first material of character because every judgment and action begins there.',
    'The five-minute return',
    'You sit down to important work and immediately feel the pull of messages, tabs, and unfinished errands.',
    ['Name the one action that belongs to this moment.', 'Remove one source of needless motion.', 'Give the action five undivided minutes before reassessing.'],
    'Choose one task you have postponed. Write the smallest honest action that would begin it today.',
    'Keep the action observable and under fifteen minutes. “Open the proposal and write its first three claims” is stronger than “make progress.”',
    'What story has delay allowed you to tell yourself?',
    [citation('marcus', marcusTitle, 'Book II, §1', 'It is high time for thee to understand the true nature both of the world, whereof thou art a part.')],
  ),
  lesson(
    2,
    'Separate event from judgment',
    'The room inside the response',
    'Distinguish what happened from the meaning your mind quickly assigns to it.',
    '“Why should any of these things that happen externally, so much distract thee?”',
    'The question does not deny pain or consequence. It exposes the extra layer we add: prediction, insult, permanence, or self-accusation. That layer can be examined before it hardens into action.',
    'A difficult message',
    'A colleague replies, “This is not ready,” and you feel your body prepare an argument.',
    ['Copy only the observable words.', 'List the judgment you added.', 'Choose a response that serves the work rather than the first feeling.'],
    'Rewrite a recent upsetting event in two lines: first as a camera would record it, then as your mind interpreted it.',
    'Do not make the second line more reasonable. Accuracy about the first interpretation is the point.',
    'Which part can you influence now?',
    [citation('marcus', marcusTitle, 'Book II, §4', 'Why should any of these things that happen externally, so much distract thee?')],
  ),
  lesson(
    3,
    'Expect difficult people',
    'Fellow workers, imperfectly informed',
    'Prepare for friction without rehearsing resentment.',
    '“We are all born to be fellow-workers, as the feet, the hands, and the eyelids.”',
    'Marcus pairs clear-eyed expectation with kinship. Other people will be vain, evasive, or ungrateful; they still participate in the same shared work. Preparation makes patience more available when friction arrives.',
    'Before the crowded meeting',
    'You know a meeting will include interruption, defensiveness, and competing incentives.',
    ['Predict the behavior without inventing a motive.', 'Decide what useful contribution remains yours.', 'Prepare one sentence that restores the shared aim.'],
    'Name one person who reliably tests your composure. Describe the behavior you can expect without describing their character.',
    'Use verbs you could verify: interrupts, delays, changes scope. Then choose your own standard of conduct.',
    'What would cooperation look like even if warmth is unavailable?',
    [citation('marcus', marcusTitle, 'Book II, §1', 'We are all born to be fellow-workers, as the feet, the hands, and the eyelids.')],
  ),
  lesson(
    4,
    'Act without theatre',
    'The last-action test',
    'Bring gravity and care to ordinary work without seeking an audience for it.',
    '“Go about every action as thy last action, free from all vanity.”',
    'The last-action test narrows attention. It removes the imagined spectators and the fantasy of doing it later. The question is not whether the task is grand, but whether your manner of doing it is honest.',
    'Send the clear answer',
    'You are tempted to make a simple response sound impressive or to delay it until it feels perfect.',
    ['State what the other person needs.', 'Remove the sentence written mainly to display yourself.', 'Send when the answer is accurate and useful.'],
    'Take a message or task from today and remove one element of performance from it.',
    'Look for throat-clearing, defensive detail, inflated scope, or a promise you cannot keep.',
    'If this were your final example of the craft, what would you keep?',
    [citation('marcus', marcusTitle, 'Book II, §2', 'Go about every action as thy last action, free from all vanity.')],
  ),
  lesson(
    5,
    'Choose a steady aim',
    'Motion needs direction',
    'Use a clear purpose to decide which demands deserve movement.',
    '“They are idle in their actions, who toil and labour in this life, and have no certain scope.”',
    'Busyness can conceal the absence of choice. Marcus treats undirected effort as a kind of idleness because it never gathers into a life. A stable aim lets many small decisions become easier.',
    'The overfull week',
    'Your calendar is packed, yet the work you value most has not moved.',
    ['Write the week’s governing aim in one sentence.', 'Mark each commitment as serving, supporting, or distracting.', 'Remove or shorten one distraction.'],
    'Write a one-sentence scope for the next seven days. Test tomorrow’s calendar against it.',
    'A useful scope names an outcome and a boundary: what matters and what may wait.',
    'Which activity feels productive mainly because it is visible?',
    [citation('marcus', marcusTitle, 'Book II, §4', 'They are idle in their actions, who toil and labour in this life, and have no certain scope.')],
  ),
  lesson(
    6,
    'Keep the ruling part free',
    'Respond from principle',
    'Identify the values that should govern you when appetite, fear, or approval pulls hard.',
    '“Suffer not that excellent part to be brought in subjection, and to become slavish.”',
    'Marcus calls reason the ruling part: the capacity to examine an impulse and choose. Freedom here is not getting every preference. It is retaining authorship of your conduct under pressure.',
    'The tempting shortcut',
    'A shortcut would save time, probably go unnoticed, and weaken a standard you claim to hold.',
    ['Name the appetite or fear making the shortcut attractive.', 'Name the standard at stake.', 'Choose the action you would be willing to explain plainly.'],
    'List three pressures that make you easier to steer. Pair each with a sentence that returns the decision to principle.',
    'Make the sentences specific enough to use: “Urgency does not decide accuracy” is better than “be strong.”',
    'What kind of discomfort most often purchases your compliance?',
    [citation('marcus', marcusTitle, 'Book II, §2', 'Suffer not that excellent part to be brought in subjection, and to become slavish.')],
  ),
  lesson(
    7,
    'See the scale of things',
    'Impermanence as proportion',
    'Use the shortness of events, praise, and discomfort to restore proportion.',
    '“Consider how quickly all things are dissolved and resolved.”',
    'Impermanence is not offered as a reason to care less. It helps care take the right shape. Praise, embarrassment, possessions, and obstacles lose their claim to be the whole horizon.',
    'After the visible mistake',
    'A public error feels permanent because your attention keeps replaying it.',
    ['Place the event on a one-year timeline.', 'Keep the concrete repair; release the imagined trial.', 'Do one action that improves what follows.'],
    'Choose one current worry and describe its likely shape in a week, a year, and ten years.',
    'Do not use distance to dismiss a real obligation. Use it to distinguish repair from rumination.',
    'What remains worth doing after the drama fades?',
    [citation('marcus', marcusTitle, 'Book II, §9', 'Consider how quickly all things are dissolved and resolved.')],
  ),
  lesson(
    8,
    'Practice the return',
    'A philosophy for ordinary days',
    'Build a brief daily review that turns Stoic ideas into repeated conduct.',
    '“Let it be thy earnest and incessant care … to perform whatsoever it is that thou art about.”',
    'A practice survives because it is small enough to repeat. Morning anticipation, a pause before judgment, and evening review form a simple loop: prepare, choose, learn, return.',
    'A three-part ritual',
    'You want the course to alter your days rather than become another finished collection.',
    ['Morning: name one likely test and your chosen response.', 'Midday: separate one event from your judgment.', 'Evening: record one action to repeat and one to repair.'],
    'Design a seven-day practice using the three-part ritual. Choose a cue already present in your day.',
    'Make the ritual take less than four minutes. Consistency is the experiment; elegance can come later.',
    'What evidence after seven days would show the practice is helping?',
    [citation('marcus', marcusTitle, 'Book II, §2', 'Let it be thy earnest and incessant care as a Roman and a man to perform whatsoever it is that thou art about.')],
  ),
]

const leonardoTitle = 'The Notebooks of Leonardo da Vinci'
const leonardoLessons: Lesson[] = [
  lesson(1, 'Let experience answer', 'Curiosity with a test', 'Turn a broad question into something you can observe or try.', '“My works are the issue of pure and simple experience, who is the one true mistress.”', 'Leonardo’s notes move between wonder and verification. Authority can suggest where to look, but experience must arbitrate claims that the senses and a sound test can reach.', 'From opinion to experiment', 'Two teammates disagree about why people abandon a form.', ['Write each explanation as a prediction.', 'Choose one observable difference between them.', 'Run the smallest test that could surprise either side.'], 'Take a belief you repeated this week. What observation would make it less certain?', 'Choose evidence you could actually encounter, not a hypothetical standard designed to protect the belief.', 'Where are you borrowing certainty from status?', [citation('leonardo', leonardoTitle, 'General introductions, §10', 'My works are the issue of pure and simple experience, who is the one true mistress.')]),
  lesson(2, 'Carry a little book', 'Observation before memory', 'Capture behavior and form before memory simplifies them.', '“You must go about, and constantly, as you go, observe, note and consider.”', 'Memory keeps the gist and discards the useful strangeness. Leonardo’s small-book habit preserves posture, sequence, contrast, and exception—the raw material from which later understanding grows.', 'The ten-minute field note', 'You want to understand how people actually navigate a café, station, or digital tool.', ['Choose one behavior, not an entire environment.', 'Record five concrete observations without explanation.', 'Only afterward add two possible patterns.'], 'Make five field notes from a familiar place as though you had never seen it.', 'Use nouns and verbs. Delay adjectives such as “confusing” until you can point to the behavior beneath them.', 'Which detail would memory have edited out?', [citation('leonardo', leonardoTitle, 'Painting, §571', 'You must go about, and constantly, as you go, observe, note and consider the circumstances and behaviour of men.')]),
  lesson(3, 'Join theory to practice', 'The rudder and the hand', 'Use a model to guide practice and let practice correct the model.', '“Those who are in love with practice without knowledge are like the sailor who gets into a ship without rudder or compass.”', 'Theory gives direction; practice gives resistance. Leonardo’s warning is against motion with no account of cause. The craftsperson alternates: form a rule, try it, notice the miss, amend the rule.', 'Learning a new craft', 'You have repeated a technique many times but your results have stopped improving.', ['State the principle the technique is meant to express.', 'Identify one result the principle predicts.', 'Change one variable and compare.'], 'Choose a skill you practise. Write the theory you are currently acting on, even if you never named it before.', 'If the theory cannot predict a difference in practice, it may be a slogan rather than a guide.', 'Where has repetition replaced feedback?', [citation('leonardo', leonardoTitle, 'Painting, §19', 'Those who are in love with practice without knowledge are like the sailor who gets into a ship without rudder or compass.')]),
  lesson(4, 'Train the eye', 'Ten attributes of sight', 'Break a complex visual impression into properties you can inspect.', '“Painting is concerned with all the 10 attributes of sight … Darkness, Light, Solidity and Colour, Form and Position, Distance and Propinquity, Motion and Rest.”', 'The list is a tool for seeing. Instead of declaring an image “good,” the observer can ask what light does, how distance reads, which form moves, and what remains still.', 'Read a room', 'A workspace feels flat and tiring, but “make it nicer” offers no direction.', ['Describe the light and darkest point.', 'Trace form, distance, and the path of movement.', 'Change the one attribute most connected to the problem.'], 'Choose one image or room and describe it using all ten attributes without evaluating it.', 'Specific description comes before preference. Once you can name the structure, you can make a deliberate change.', 'Which attribute do you habitually overlook?', [citation('leonardo', leonardoTitle, 'Painting, §23', 'Painting is concerned with all the 10 attributes of sight; which are: Darkness, Light, Solidity and Colour, Form and Position, Distance and Propinquity, Motion and Rest.')]),
  lesson(5, 'Step back to see', 'Distance changes judgment', 'Choose a viewing distance that matches the decision you need to make.', '“An object can never be seen perfectly unless the space between it and the eye is equal, at least, to the length of the face.”', 'The optical claim opens into a working habit. Nearness reveals texture and hides proportion; distance reveals proportion and hides texture. Good judgment deliberately changes scale.', 'Editing the whole', 'You have polished sentences for an hour but cannot tell whether the argument moves.', ['Zoom out until only the structure is visible.', 'Name the function of each section.', 'Return close only after the sequence works.'], 'Review a current project at three scales: detail, section, and whole. Record one discovery at each.', 'Use a different representation for each scale: sentence, outline, and one-line purpose.', 'Which scale has become a hiding place?', [citation('leonardo', leonardoTitle, 'Painting, §25', 'An object can never be seen perfectly unless the space between it and the eye is equal, at least, to the length of the face.')]),
  lesson(6, 'Study the transition', 'Light teaches through change', 'Observe a system while conditions change, not only after it settles.', '“It cannot see immediately on going out of the light and into the shade … and this very thing has already deceived me.”', 'Leonardo turns his own mistake into evidence. The eye adapts over time, so the observer must account for the transition. Many systems reveal their mechanism in the lag between two states.', 'The misleading first minute', 'A new workflow initially feels worse because attention and habit have not adapted.', ['Name what changed in the environment.', 'Separate transition cost from steady-state quality.', 'Choose when you will measure again.'], 'Find one judgment you made during a transition. What lag or adaptation might the judgment omit?', 'Do not assume every bad first experience improves. Specify a later observation that could confirm or reject the adaptation theory.', 'What did the mistake teach that success concealed?', [citation('leonardo', leonardoTitle, 'Painting, §36', 'It cannot see immediately on going out of the light and into the shade, nor, in the same way, out of the shade into the light, and this very thing has already deceived me in painting an eye, and from that I learnt it.')]),
  lesson(7, 'Follow motion through form', 'Water as a thinking partner', 'Use analogies carefully to notice recurring patterns across systems.', '“A book of the various movements of waters passing through channels of different forms.”', 'Leonardo does not reduce water to one essence. He watches the same material behave differently under pressure, channel, heat, and terrain. A useful analogy preserves this dependence on conditions.', 'Map the current', 'A team keeps treating resistance as a personality problem.', ['Draw where information enters and where it narrows.', 'Mark pools, bottlenecks, and sudden drops.', 'Change one condition before judging a person.'], 'Sketch a process as a flow. Label where it accelerates, backs up, disperses, or disappears.', 'Treat the water language as a prompt for observation, not proof that the systems are identical.', 'Which behavior belongs to the channel more than the person?', [citation('leonardo', leonardoTitle, 'Hydraulic works, §927', 'A book of the various movements of waters passing through channels of different forms.')]),
  lesson(8, 'Bind insight to use', 'A proposition earns an application', 'Complete an inquiry by stating where its result can be used or tested next.', '“Remember to include under each proposition its application and use, in order that this science may not be useless.”', 'For Leonardo, understanding wants embodiment. The final step is not decoration; application exposes whether a proposition is clear enough to carry into a different situation.', 'Close the notebook loop', 'You have accumulated observations and ideas but rarely return to them.', ['Select one note with a live question.', 'Write a possible application in one sentence.', 'Schedule the smallest use or test.'], 'Review five notes from this course. Add “This could be used to…” beneath each, then choose one action.', 'An application may be a drawing, a test, a changed decision, or a question asked in a new place.', 'Which note becomes more interesting when it must do work?', [citation('leonardo', leonardoTitle, 'Preparation of the manuscripts, §2', 'Remember to include under each proposition its application and use, in order that this science may not be useless.')]),
]

const sunTitle = 'The Art of War'
const sunLessons: Lesson[] = [
  lesson(1, 'Measure before moving', 'The five constant factors', 'Map the conditions that determine whether a plan can hold.', '“The art of war, then, is governed by five constant factors, to be taken into account in one’s deliberations.”', 'Sun Tzu begins with inquiry. Purpose, conditions, terrain, leadership, and method interact; confidence without comparison is noise. Outside war, the framework helps expose what a plan quietly assumes.', 'A launch under uncertainty', 'A team wants to commit to a date before checking demand, capacity, and dependencies.', ['Name the shared purpose.', 'List external conditions and practical terrain.', 'Assess leadership and operating method without optimism.'], 'Choose a plan and score its purpose, timing, terrain, leadership, and method from one to five.', 'The number matters less than the evidence beside it. Write one fact and one uncertainty for every score.', 'Which weak factor could nullify all the strong ones?', [citation('sun', sunTitle, 'Chapter I, §§3–4', 'The art of war, then, is governed by five constant factors, to be taken into account in one’s deliberations.')]),
  lesson(2, 'Calculate in the temple', 'Decisions before pressure', 'Do the comparison that urgency will later tempt you to skip.', '“The general who wins a battle makes many calculations in his temple ere the battle is fought.”', 'Preparation creates options while change is still cheap. Calculation does not promise certainty; it reveals what must be true, what could fail, and what signal should alter the plan.', 'Before the negotiation', 'A high-stakes call is tomorrow and the team has discussed only its preferred outcome.', ['Define the walk-away condition.', 'Model the other side’s constraints.', 'Prepare a response to the two likeliest surprises.'], 'For one upcoming decision, write three conditions for success and three reasons each might fail.', 'Add an early signal for each failure. A risk becomes useful when it can change your behavior.', 'What are you calling unpredictable because you have not examined it?', [citation('sun', sunTitle, 'Chapter I, §26', 'The general who wins a battle makes many calculations in his temple ere the battle is fought.')]),
  lesson(3, 'Stay responsive to conditions', 'Plans are instruments', 'Hold a clear aim while changing the route as circumstances change.', '“According as circumstances are favourable, one should modify one’s plans.”', 'A plan is a provisional arrangement of action, not a vow to yesterday’s assumptions. Discipline includes the capacity to change at the right signal without abandoning the purpose.', 'The vanished assumption', 'Halfway through a project, the customer behavior that justified the approach changes.', ['Name the original assumption.', 'Confirm the new evidence.', 'Keep the aim; redesign the route and communicate why.'], 'Identify one active plan and the assumption most likely to expire. Define the evidence that would trigger a change.', 'A trigger should be observable and agreed before pride becomes invested in the current route.', 'What would adaptation preserve?', [citation('sun', sunTitle, 'Chapter I, §17', 'According as circumstances are favourable, one should modify one’s plans.')]),
  lesson(4, 'Count the full cost', 'Avoid the lengthy campaign', 'Include time, attention, morale, and opportunity when estimating a commitment.', '“In war, then, let your great object be victory, not lengthy campaigns.”', 'Sun Tzu repeatedly treats duration as a cost multiplier. A campaign can continue after its value disappears because sunk effort and public commitment make stopping feel like defeat.', 'The endless initiative', 'A project still produces activity but no longer advances the outcome that began it.', ['Restate the desired victory.', 'Count recurring cost and displaced work.', 'Choose to finish, narrow, pause, or end.'], 'Audit one long-running commitment. What would “victory” mean now, and what is another month actually buying?', 'Include maintenance, coordination, attention, and the better work that cannot begin.', 'Has duration quietly become the goal?', [citation('sun', sunTitle, 'Chapter II, §19', 'In war, then, let your great object be victory, not lengthy campaigns.')]),
  lesson(5, 'Win the whole', 'The value of indirect victory', 'Look for ways to remove resistance without destroying what you need afterward.', '“Supreme excellence consists in breaking the enemy’s resistance without fighting.”', 'The memorable line sits inside a broader preference for taking things whole. The best strategy changes incentives, options, or understanding so that costly collision becomes unnecessary.', 'A repeated conflict', 'Two groups defend incompatible processes and another escalation will harden both sides.', ['Find the interest beneath each position.', 'Change the choice architecture or shared evidence.', 'Preserve the relationship needed after the decision.'], 'Take one conflict and list three outcomes that would resolve it without humiliating either side.', 'Do not confuse avoidance with indirect victory. The underlying resistance still has to change.', 'What valuable thing would direct attack damage?', [citation('sun', sunTitle, 'Chapter III, §2', 'Supreme excellence consists in breaking the enemy’s resistance without fighting.')]),
  lesson(6, 'Know both sides', 'Self-knowledge is comparative', 'Pair an honest view of your capacity with a grounded view of the environment.', '“If you know the enemy and know yourself, you need not fear the result of a hundred battles.”', 'Knowledge of only one side produces alternating confidence and surprise. Strategy is relational: your strengths matter against specific conditions, and the same environment meets different teams differently.', 'Choosing a market', 'A product is strong in isolation, but the team has studied customers more than alternatives and its own delivery limits.', ['Map the environment and alternatives.', 'Audit your actual advantages and constraints.', 'Choose where the match is favorable.'], 'Make two columns for a decision: “conditions outside us” and “capacity within us.” Add evidence, not aspirations.', 'Pay special attention to mismatches: speed needed versus speed available, trust required versus trust earned.', 'Which fact about yourself changes the external opportunity?', [citation('sun', sunTitle, 'Chapter III, §18', 'If you know the enemy and know yourself, you need not fear the result of a hundred battles.')]),
  lesson(7, 'Prepare the victory', 'Shape before force', 'Improve the conditions of action before relying on effort during action.', '“The victorious strategist only seeks battle after the victory has been won.”', 'This is sequencing, not magic. Position, preparation, timing, and information can make success likely before the visible contest begins. Heroic recovery is often the price of neglected design.', 'The calm release', 'A team expects launch day effort to compensate for unclear ownership and untested recovery.', ['Resolve ownership before the event.', 'Rehearse the likely failure path.', 'Reduce the number of things that must go right at once.'], 'For an upcoming moment of execution, list what can be made true beforehand so the moment becomes ordinary.', 'Prefer structural preparation over reminders to “be careful.”', 'Where are you depending on heroics?', [citation('sun', sunTitle, 'Chapter IV, §15', 'The victorious strategist only seeks battle after the victory has been won.')]),
  lesson(8, 'Be shaped by the ground', 'Water keeps no constant form', 'Adapt method to reality while preserving purpose and principle.', '“Just as water retains no constant shape, so in warfare there are no constant conditions.”', 'Water responds to the ground without losing its nature. Sun Tzu’s closing image for adaptability rejects fixed recipes. Mastery is an ability to read difference and compose a fitting response.', 'One playbook, three teams', 'A process that worked in one context is imposed unchanged on groups with different constraints.', ['Name the principle the process served.', 'Read each group’s terrain and obstacles.', 'Recompose the method while keeping the principle visible.'], 'Choose a rule you apply everywhere. Describe two contexts in which its form should differ.', 'Do not make flexibility arbitrary. State the principle that remains constant while form changes.', 'What is the ground asking the method to become?', [citation('sun', sunTitle, 'Chapter VI, §33', 'Just as water retains no constant shape, so in warfare there are no constant conditions.')]),
]

export const starterCourses: CoursePack[] = [
  {
    schemaVersion: 1,
    id: 'marcus-aurelius-meditations',
    title: 'A Steady Mind',
    teacher: { id: 'marcus-aurelius', name: 'Marcus Aurelius', life: '121–180 CE', role: 'Stoic philosopher and Roman emperor', portrait: '/portraits/marcus-aurelius.jpg', portraitAlt: 'Painted interpretation of Marcus Aurelius in Roman dress' },
    summary: 'A practical course in attention, judgment, action, and returning to what is yours to govern.',
    promise: 'Meet the day with more clarity and less needless friction.',
    theme: 'sage',
    source: { id: 'marcus', title: marcusTitle, edition: 'George Long tradition, Project Gutenberg eBook 2680', url: sourceUrls.marcus, localPath: '/sources/meditations.txt', coverage: 'Twelve books in the supplied public-domain English edition.' },
    lessons: marcusLessons,
  },
  {
    schemaVersion: 1,
    id: 'leonardo-notebooks',
    title: 'The Practice of Curiosity',
    teacher: { id: 'leonardo-da-vinci', name: 'Leonardo da Vinci', life: '1452–1519', role: 'Artist, engineer, and observer', portrait: '/portraits/leonardo-da-vinci.jpg', portraitAlt: 'Painted interpretation of Leonardo da Vinci holding a notebook' },
    summary: 'Learn to observe closely, test ideas, change scale, and connect every proposition to use.',
    promise: 'Turn curiosity into a disciplined way of seeing and making.',
    theme: 'apricot',
    source: { id: 'leonardo', title: leonardoTitle, edition: 'Jean Paul Richter translation, 1888; Project Gutenberg eBook 5000', url: sourceUrls.leonardo, localPath: '/sources/leonardo-notebooks.txt', coverage: 'The two-volume Richter selection; editor notes are marked separately in the source.' },
    lessons: leonardoLessons,
  },
  {
    schemaVersion: 1,
    id: 'sun-tzu-art-of-war',
    title: 'Strategy Before Force',
    teacher: { id: 'sun-tzu', name: 'Sun Tzu', life: 'trad. 5th century BCE', role: 'Strategist and military thinker', portrait: '/portraits/sun-tzu.jpg', portraitAlt: 'Ink-and-gouache imagined portrait of Sun Tzu with a bamboo manuscript' },
    summary: 'Read conditions, count costs, prepare advantage, and adapt without losing your aim.',
    promise: 'Make better decisions before pressure narrows the field.',
    theme: 'parchment',
    source: { id: 'sun', title: sunTitle, edition: 'Lionel Giles translation, 1910; Project Gutenberg eBook 132', url: sourceUrls.sun, localPath: '/sources/art-of-war.txt', coverage: 'All thirteen chapters plus Giles’s notes; author text and commentary remain distinguishable.' },
    lessons: sunLessons,
  },
]

export const coursesById = Object.fromEntries(starterCourses.map((course) => [course.id, course]))
export const teachersById = Object.fromEntries(starterCourses.map((course) => [course.teacher.id, course.teacher]))

export function getCourse(courseId?: string) {
  return courseId ? coursesById[courseId] : undefined
}

export function getLesson(course: CoursePack, lessonId?: string) {
  return course.lessons.find((item) => item.id === lessonId) ?? course.lessons[0]
}
