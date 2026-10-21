export interface SeedBibleQuestion {
  id: string;
  questionText: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
  bibleReference: string;
  category:
    | 'Bible Characters'
    | 'Old Testament'
    | 'New Testament'
    | 'Life and Teachings of Jesus'
    | 'Miracles and Parables'
    | 'Books of the Bible'
    | 'Scripture Knowledge';
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'published';
}

export const SEED_BIBLE_QUESTIONS: SeedBibleQuestion[] = [
  // --- Category 1: Bible Characters ---
  {
    id: 'bq-char-001',
    questionText: 'Who was chosen to replace Judas Iscariot as the twelfth apostle?',
    options: ['Barnabas', 'Matthias', 'Silas', 'Timothy'],
    correctOptionIndex: 1,
    explanation: 'After praying, the apostles cast lots and the lot fell on Matthias, who was numbered with the eleven apostles.',
    bibleReference: 'Acts 1:23-26',
    category: 'Bible Characters',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-char-002',
    questionText: 'Which queen risked her life by approaching King Xerxes uninvited to save her people?',
    options: ['Vashti', 'Esther', 'Athaliah', 'Jezebel'],
    correctOptionIndex: 1,
    explanation: 'Queen Esther bravely went before the Persian king, declaring, "If I perish, I perish," and saved the Jewish people from destruction.',
    bibleReference: 'Esther 4:16',
    category: 'Bible Characters',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-char-003',
    questionText: 'Who was described in Scripture as a man after God’s own heart?',
    options: ['Moses', 'David', 'Solomon', 'Samuel'],
    correctOptionIndex: 1,
    explanation: 'God testified of David, son of Jesse: "I have found David son of Jesse, a man after my own heart; he will do everything I want him to do."',
    bibleReference: '1 Samuel 13:14; Acts 13:22',
    category: 'Bible Characters',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-char-004',
    questionText: 'Which prophet was taken up into heaven by a whirlwind in a chariot of fire?',
    options: ['Elisha', 'Enoch', 'Elijah', 'Isaiah'],
    correctOptionIndex: 2,
    explanation: 'As Elijah and Elisha walked along talking together, a chariot of fire and horses of fire appeared, and Elijah went up to heaven in a whirlwind.',
    bibleReference: '2 Kings 2:11',
    category: 'Bible Characters',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-char-005',
    questionText: 'Who was Moses’ father-in-law who advised him to appoint judges over thousands, hundreds, fifties, and tens?',
    options: ['Jethro', 'Balaam', 'Melchizedek', 'Potiphar'],
    correctOptionIndex: 0,
    explanation: 'Jethro, the priest of Midian, observed Moses judging the people alone all day and advised him to delegate disputes to capable, God-fearing leaders.',
    bibleReference: 'Exodus 18:17-24',
    category: 'Bible Characters',
    difficulty: 'hard',
    status: 'published'
  },

  // --- Category 2: Old Testament ---
  {
    id: 'bq-ot-001',
    questionText: 'On which mount did Moses receive the Ten Commandments inscribed on tablets of stone?',
    options: ['Mount Carmel', 'Mount Sinai', 'Mount Nebo', 'Mount Hermon'],
    correctOptionIndex: 1,
    explanation: 'The Lord called Moses to the top of Mount Sinai, where He descended in fire and gave the covenant commandments.',
    bibleReference: 'Exodus 19:20; 20:1-17',
    category: 'Old Testament',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-ot-002',
    questionText: 'How many days and nights did rain fall upon the earth during the great flood in the days of Noah?',
    options: ['7 days and 7 nights', '40 days and 40 nights', '100 days and 100 nights', '150 days and 150 nights'],
    correctOptionIndex: 1,
    explanation: 'Genesis records that rain fell upon the earth for forty days and forty nights, flooding the land.',
    bibleReference: 'Genesis 7:12',
    category: 'Old Testament',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-ot-003',
    questionText: 'What kind of wood did God command Noah to use to construct the Ark?',
    options: ['Cedar of Lebanon', 'Acacia wood', 'Gopher wood', 'Olive wood'],
    correctOptionIndex: 2,
    explanation: 'God specifically commanded Noah: "Make yourself an ark of gopher wood; make rooms in the ark, and cover it inside and outside with pitch."',
    bibleReference: 'Genesis 6:14',
    category: 'Old Testament',
    difficulty: 'hard',
    status: 'published'
  },
  {
    id: 'bq-ot-004',
    questionText: 'Which young shepherd used a sling and a smooth stone to strike down Goliath the Philistine champion?',
    options: ['Jonathan', 'David', 'Asahel', 'Joab'],
    correctOptionIndex: 1,
    explanation: 'David reached into his bag, took out a stone, slung it, and struck the Philistine on the forehead in the name of the Lord of hosts.',
    bibleReference: '1 Samuel 17:48-50',
    category: 'Old Testament',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-ot-005',
    questionText: 'Which king of Judah prayed earnestly when Sennacherib of Assyria threatened Jerusalem, leading God to deliver the city?',
    options: ['Josiah', 'Hezekiah', 'Jehoshaphat', 'Uzziah'],
    correctOptionIndex: 1,
    explanation: 'King Hezekiah spread Sennacherib’s mocking letter before the Lord in the temple, and God sent an angel who struck down the Assyrian camp.',
    bibleReference: '2 Kings 19:14-35',
    category: 'Old Testament',
    difficulty: 'medium',
    status: 'published'
  },

  // --- Category 3: New Testament ---
  {
    id: 'bq-nt-001',
    questionText: 'On which day did the Holy Spirit descend upon the disciples in Jerusalem with a sound like a rushing mighty wind?',
    options: ['Passover', 'The Day of Atonement', 'The Day of Pentecost', 'The Feast of Tabernacles'],
    correctOptionIndex: 2,
    explanation: 'When the Day of Pentecost came, they were all together in one place, and tongues of fire rested on each of them as they were filled with the Holy Spirit.',
    bibleReference: 'Acts 2:1-4',
    category: 'New Testament',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-nt-002',
    questionText: 'On the road to which city was Saul blinded by a heavenly light and converted to Jesus Christ?',
    options: ['Antioch', 'Damascus', 'Rome', 'Alexandria'],
    correctOptionIndex: 1,
    explanation: 'As Saul neared Damascus on his journey, suddenly a light from heaven flashed around him, and Jesus spoke to him.',
    bibleReference: 'Acts 9:3-6',
    category: 'New Testament',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-nt-003',
    questionText: 'Which seller of purple fabric in Philippi opened her heart to Paul’s gospel message and hosted the apostles?',
    options: ['Priscilla', 'Lydia', 'Phoebe', 'Dorcas'],
    correctOptionIndex: 1,
    explanation: 'Lydia, a worshiper of God from the city of Thyatira who dealt in purple cloth, responded to Paul’s message and was baptized with her household.',
    bibleReference: 'Acts 16:14-15',
    category: 'New Testament',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-nt-004',
    questionText: 'According to Paul in 1 Corinthians 13, which virtue is the greatest of faith, hope, and love?',
    options: ['Faith', 'Hope', 'Love', 'Wisdom'],
    correctOptionIndex: 2,
    explanation: 'Paul concluded his discourse on spiritual gifts with: "And now these three remain: faith, hope and love. But the greatest of these is love."',
    bibleReference: '1 Corinthians 13:13',
    category: 'New Testament',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-nt-005',
    questionText: 'On which island was John exiled when he received the revelation of Jesus Christ?',
    options: ['Crete', 'Cyprus', 'Patmos', 'Malta'],
    correctOptionIndex: 2,
    explanation: 'John wrote: "I, John... was on the island of Patmos because of the word of God and the testimony of Jesus."',
    bibleReference: 'Revelation 1:9',
    category: 'New Testament',
    difficulty: 'medium',
    status: 'published'
  },

  // --- Category 4: Life and Teachings of Jesus ---
  {
    id: 'bq-jesus-001',
    questionText: 'In which town was Jesus Christ born, fulfilling the prophecy of Micah?',
    options: ['Nazareth', 'Bethlehem', 'Jerusalem', 'Capernaum'],
    correctOptionIndex: 1,
    explanation: 'Jesus was born in Bethlehem of Judea during the reign of King Herod, fulfilling Micah 5:2.',
    bibleReference: 'Matthew 2:1; Micah 5:2',
    category: 'Life and Teachings of Jesus',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-jesus-002',
    questionText: 'What is the first Beatitude delivered by Jesus in the Sermon on the Mount?',
    options: [
      'Blessed are the meek, for they will inherit the earth',
      'Blessed are the peacemakers, for they will be called children of God',
      'Blessed are the poor in spirit, for theirs is the kingdom of heaven',
      'Blessed are the pure in heart, for they will see God'
    ],
    correctOptionIndex: 2,
    explanation: 'Jesus opened His Sermon on the Mount declaring: "Blessed are the poor in spirit, for theirs is the kingdom of heaven."',
    bibleReference: 'Matthew 5:3',
    category: 'Life and Teachings of Jesus',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-jesus-003',
    questionText: 'How many days and nights did Jesus fast in the wilderness before being tempted by the devil?',
    options: ['3 days', '7 days', '12 days', '40 days'],
    correctOptionIndex: 3,
    explanation: 'After fasting forty days and forty nights in the Judean wilderness, Jesus was hungry, and the tempter came to Him.',
    bibleReference: 'Matthew 4:1-2',
    category: 'Life and Teachings of Jesus',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-jesus-004',
    questionText: 'When asked about the greatest commandment in the Law, what did Jesus say is the first and greatest commandment?',
    options: [
      'Do unto others as you would have them do unto you',
      'Love the Lord your God with all your heart, soul, and mind',
      'Love your neighbor as yourself',
      'Honor your father and mother'
    ],
    correctOptionIndex: 1,
    explanation: 'Jesus replied: "\'Love the Lord your God with all your heart and with all your soul and with all your mind.\' This is the first and greatest commandment."',
    bibleReference: 'Matthew 22:37-38',
    category: 'Life and Teachings of Jesus',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-jesus-005',
    questionText: 'What Roman governor presided over the trial of Jesus and washed his hands of His blood?',
    options: ['Pontius Pilate', 'Felix', 'Festus', 'Gallio'],
    correctOptionIndex: 0,
    explanation: 'When Pilate saw that he was getting nowhere, he took water and washed his hands in front of the crowd, saying, "I am innocent of this man’s blood."',
    bibleReference: 'Matthew 27:24',
    category: 'Life and Teachings of Jesus',
    difficulty: 'easy',
    status: 'published'
  },

  // --- Category 5: Miracles and Parables ---
  {
    id: 'bq-miracles-001',
    questionText: 'What was the first recorded miracle performed by Jesus during His earthly ministry?',
    options: [
      'Healing a blind man at Siloam',
      'Feeding the five thousand',
      'Turning water into wine at Cana',
      'Calming the storm on the Sea of Galilee'
    ],
    correctOptionIndex: 2,
    explanation: 'In Cana of Galilee, Jesus turned water into choice wine at a wedding feast, which John marks as the first of His signs.',
    bibleReference: 'John 2:1-11',
    category: 'Miracles and Parables',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-miracles-002',
    questionText: 'In the Parable of the Good Samaritan, who was the first person to pass by the wounded traveler on the other side?',
    options: ['A Pharisee', 'A Priest', 'A Levite', 'A Roman centurion'],
    correctOptionIndex: 1,
    explanation: 'Jesus said a priest happened to be going down the same road, and when he saw the man, he passed by on the other side.',
    bibleReference: 'Luke 10:31',
    category: 'Miracles and Parables',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-miracles-003',
    questionText: 'How many loaves and fish did the boy provide that Jesus multiplied to feed the five thousand men?',
    options: ['5 loaves and 2 fish', '7 loaves and a few small fish', '3 loaves and 5 fish', '12 loaves and 2 fish'],
    correctOptionIndex: 0,
    explanation: 'Andrew pointed out a young boy with five barley loaves and two small fish, which Jesus blessed and multiplied with twelve baskets left over.',
    bibleReference: 'John 6:9-13',
    category: 'Miracles and Parables',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-miracles-004',
    questionText: 'For how many days had Lazarus been in the tomb before Jesus arrived in Bethany and raised him from the dead?',
    options: ['1 day', '2 days', '3 days', '4 days'],
    correctOptionIndex: 3,
    explanation: 'When Jesus arrived, He found that Lazarus had already been in the tomb for four days. Martha noted, "by this time there is a bad odor."',
    bibleReference: 'John 11:17, 39-44',
    category: 'Miracles and Parables',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-miracles-005',
    questionText: 'In the Parable of the Prodigal Son, what three items did the compassionate father order for his returning younger son?',
    options: [
      'A golden crown, a harp, and white sandals',
      'The best robe, a ring on his finger, and sandals on his feet',
      'A staff of authority, a new tent, and oil of gladness',
      'A silver chariot, bread of heaven, and wine'
    ],
    correctOptionIndex: 1,
    explanation: 'The father said to his servants: "Quick! Bring the best robe and put it on him. Put a ring on his finger and sandals on his feet."',
    bibleReference: 'Luke 15:22',
    category: 'Miracles and Parables',
    difficulty: 'medium',
    status: 'published'
  },

  // --- Category 6: Books of the Bible ---
  {
    id: 'bq-books-001',
    questionText: 'How many total books are in the canonical Protestant Christian Bible (Old and New Testaments combined)?',
    options: ['60 books', '66 books', '70 books', '73 books'],
    correctOptionIndex: 1,
    explanation: 'The Protestant biblical canon contains 66 inspired books: 39 in the Old Testament and 27 in the New Testament.',
    bibleReference: 'Biblical Canon Overview',
    category: 'Books of the Bible',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-books-002',
    questionText: 'Which book immediately precedes the Gospel according to Matthew in the Old Testament order?',
    options: ['Zechariah', 'Malachi', 'Haggai', 'Micah'],
    correctOptionIndex: 1,
    explanation: 'Malachi is the thirty-ninth and final book of the Old Testament canon, looking forward to the messenger who prepares the way.',
    bibleReference: 'Malachi 4:5-6',
    category: 'Books of the Bible',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-books-003',
    questionText: 'Which is the shortest book in the Old Testament by verse count?',
    options: ['Jonah', 'Nahum', 'Obadiah', 'Habakkuk'],
    correctOptionIndex: 2,
    explanation: 'The prophecy of Obadiah consists of just a single chapter of 21 verses, making it the shortest book in the Old Testament.',
    bibleReference: 'Obadiah 1:1-21',
    category: 'Books of the Bible',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-books-004',
    questionText: 'Which book of the New Testament was written by the physician Luke as a sequel to his Gospel?',
    options: ['Romans', 'Galatians', 'Acts of the Apostles', 'Hebrews'],
    correctOptionIndex: 2,
    explanation: 'Luke addressed both his Gospel and the Acts of the Apostles to Theophilus, chronicling the birth and expansion of the early church.',
    bibleReference: 'Acts 1:1-2; Luke 1:1-4',
    category: 'Books of the Bible',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-books-005',
    questionText: 'Which poetic Old Testament book repeatedly contemplates the theme: "Vanity of vanities, all is vanity"?',
    options: ['Job', 'Proverbs', 'Ecclesiastes', 'Song of Songs'],
    correctOptionIndex: 2,
    explanation: 'Ecclesiastes (the Teacher) reflects deeply on the transient nature of life under the sun and concludes with reverence for God.',
    bibleReference: 'Ecclesiastes 1:2; 12:13',
    category: 'Books of the Bible',
    difficulty: 'medium',
    status: 'published'
  },

  // --- Category 7: Scripture Knowledge ---
  {
    id: 'bq-scripture-001',
    questionText: 'Complete the verse: "Thy word is a lamp unto my feet, and a light unto my..."',
    options: ['Eyes', 'Heart', 'Path', 'Way'],
    correctOptionIndex: 2,
    explanation: 'Psalm 119:105 proclaims: "Your word is a lamp for my feet, a light on my path."',
    bibleReference: 'Psalm 119:105',
    category: 'Scripture Knowledge',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-scripture-002',
    questionText: 'Which fruit of the Spirit listed in Galatians 5:22-23 is mentioned first?',
    options: ['Joy', 'Peace', 'Love', 'Patience'],
    correctOptionIndex: 2,
    explanation: 'Galatians 5:22 declares: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness..."',
    bibleReference: 'Galatians 5:22-23',
    category: 'Scripture Knowledge',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-scripture-003',
    questionText: 'According to Hebrews 11:1, what is faith the substance of?',
    options: [
      'Things hoped for, the evidence of things not seen',
      'Things seen, the evidence of righteousness',
      'The law of Moses and the teachings of the prophets',
      'Good works done in humility before God'
    ],
    correctOptionIndex: 0,
    explanation: 'Hebrews 11:1 defines faith: "Now faith is confidence in what we hope for and assurance about what we do not see."',
    bibleReference: 'Hebrews 11:1',
    category: 'Scripture Knowledge',
    difficulty: 'easy',
    status: 'published'
  },
  {
    id: 'bq-scripture-004',
    questionText: 'In Ephesians 6:10-18, which spiritual weapon is designated as the sword of the Spirit?',
    options: ['The shield of faith', 'The helmet of salvation', 'The word of God', 'The breastplate of righteousness'],
    correctOptionIndex: 2,
    explanation: 'Ephesians 6:17 instructs believers: "Take the helmet of salvation and the sword of the Spirit, which is the word of God."',
    bibleReference: 'Ephesians 6:17',
    category: 'Scripture Knowledge',
    difficulty: 'medium',
    status: 'published'
  },
  {
    id: 'bq-scripture-005',
    questionText: 'What does Proverbs 9:10 state is the beginning of wisdom?',
    options: [
      'The counsel of the elders',
      'The study of the Scriptures',
      'The fear of the Lord',
      'The pursuit of righteous deeds'
    ],
    correctOptionIndex: 2,
    explanation: 'Proverbs 9:10 teaches: "The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding."',
    bibleReference: 'Proverbs 9:10',
    category: 'Scripture Knowledge',
    difficulty: 'easy',
    status: 'published'
  }
];
