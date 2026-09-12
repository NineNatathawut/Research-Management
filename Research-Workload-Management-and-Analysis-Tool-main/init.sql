-- กำหนดสถานะ (Enum Types)
CREATE TYPE paper_status AS ENUM ('DRAFT_AUTO', 'PENDING_CO_AUTHOR', 'COMPLETED');
CREATE TYPE author_status AS ENUM ('PENDING', 'CONFIRMED');

-- Table: users (ฐานข้อมูลอาจารย์และบุคลากร)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    department VARCHAR(255),
    position VARCHAR(255),
    scholar_id VARCHAR(100),
    scopus_id VARCHAR(100),  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: papers (ข้อมูลผลงานตั้งต้น)
CREATE TABLE papers (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    publish_year INTEGER,
    authors_raw TEXT,
    cited_by INTEGER DEFAULT 0,
    scholar_url TEXT,
    source VARCHAR(50) DEFAULT 'scholar',
    status paper_status DEFAULT 'DRAFT_AUTO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: paper_authors (ระบบซิงก์ % Contribution)
CREATE TABLE paper_authors (
    id SERIAL PRIMARY KEY,
    paper_id INTEGER REFERENCES papers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contribution_percent NUMERIC(5,2) DEFAULT 0.00,
    is_first_author BOOLEAN DEFAULT FALSE,
    is_co_first_author BOOLEAN DEFAULT FALSE,
    is_corresponding BOOLEAN DEFAULT FALSE,
    is_co_corresponding BOOLEAN DEFAULT FALSE,
    author_order INTEGER,
    status author_status DEFAULT 'PENDING',
    confirmed_at TIMESTAMP,
    UNIQUE(paper_id, user_id)
);

-- Indexes for author role queries
CREATE INDEX IF NOT EXISTS idx_paper_authors_roles 
ON paper_authors (is_first_author, is_corresponding, is_co_first_author, is_co_corresponding);

CREATE INDEX IF NOT EXISTS idx_paper_authors_order 
ON paper_authors (paper_id, author_order);

-- Table: paper_blacklists (ถังขยะสำหรับผลงานแปลกปลอม)
CREATE TABLE paper_blacklists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    scholar_title TEXT NOT NULL,
    rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scholar_title)
);

-- ==============================================================================
-- ข้อมูลบุคลากรตั้งต้น (University of Phayao - ICT Faculty)
-- คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยพะเยา
-- ลำดับตามเว็บไซต์ https://ict.up.ac.th/personnel
-- ==============================================================================

INSERT INTO users (email, name_en, name_th, department, position, scholar_id) VALUES 

    -- --------------------------------------------------------------------------
    -- 1. สาขาวิชาคอมพิวเตอร์กราฟิกและมัลติมีเดีย (Computer Graphics and Multimedia)
    -- --------------------------------------------------------------------------
    ('rachen.su@up.ac.th',      'Rachen Sookmuang',             'ราเชนทร์ สุขม่วง',              'Computer Graphics and Multimedia', 'ประธานหลักสูตร / อาจารย์', NULL),
    ('ratanapat.su@up.ac.th',   'Ratanapat Suchat',            'รตนพรรษ สุชาติ',              'Computer Graphics and Multimedia', 'ผู้ช่วยศาสตราจารย์', 'w0vNVh8AAAAJ'),
    ('nakharet.ch@up.ac.th',    'nakharet chaikaew',          'นคเรศ ชัยแก้ว',                'Computer Graphics and Multimedia', 'ผู้ช่วยศาสตราจารย์', 'hSZaKRAAAAAJ'),
    ('suleeporn.ka@up.ac.th',   'Suleeporn Kamchompoo',         'ศุลีพร คำชมภู',                'Computer Graphics and Multimedia', 'ผู้ช่วยศาสตราจารย์', 'NZ3ZSWoAAAAJ'),
    ('pakawad.bu@up.ac.th',     'Pakawad Butsri',               'ภควัส บุตรศรี',                'Computer Graphics and Multimedia', 'อาจารย์', NULL),
    ('wisoot.ka@up.ac.th',      'wisoot kaenmueang',             'วิสูตร แก่นเมือง',              'Computer Graphics and Multimedia', 'อาจารย์', 'UImKTowAAAAJ'),
    ('apiwat.pu@up.ac.th',      'apiwat puntatong',            'อภิวัฒน์ ปันทะธง',              'Computer Graphics and Multimedia', 'อาจารย์', 'X2VbOl8AAAAJ'),
    ('thapanapong.sa@up.ac.th', 'Thapanapong Sararat',          'ฐาปนพงศ์ สารรัตน์',             'Computer Graphics and Multimedia', 'อาจารย์', 'BFmk2WkAAAAJ'),
    ('wanvajee.kh@up.ac.th',    'Wanvajee Krutnoi',             'วรรณวจี ครุธน้อย',              'Computer Graphics and Multimedia', 'ผู้ช่วยสอน', NULL),
    


    -- --------------------------------------------------------------------------
    -- 2. สาขาวิชาธุรกิจดิจิทัล (Digital Business)
    -- --------------------------------------------------------------------------
    ('supan.to@up.ac.th',       'supan tongphet',             'สุพรรณ์ ทองเพชร',              'Digital Business', 'ประธานหลักสูตร / อาจารย์', 'j8NfztMAAAAJ'),
    ('thitirath.ch@up.ac.th',   'Thitirath Cheowsuwan',         'ฐิติรัตน์ เชี่ยวสุวรรณ',          'Digital Business', 'รองศาสตราจารย์ / รองอธิการบดี', NULL),
    ('kaewarin.ja@up.ac.th',    'kaewarin jandum',             'เกวรินทร์ จันทร์ดำ',            'Digital Business', 'อาจารย์ / รองคณบดี', 'upsWdfgAAAAJ'),
    ('napa.ra@up.ac.th',        'Napa Rachata',                'นภา ราชตา',                   'Digital Business', 'ผู้ช่วยศาสตราจารย์ / รองคณบดี', 'EwzRbK4AAAAJ'),
    ('krittika.ka@up.ac.th',    'krittika kantawong',           'กฤติกา กันทวงค์',              'Digital Business', 'ผู้ช่วยศาสตราจารย์ / ผู้ช่วยคณบดี', 'bKG2lWkAAAAJ'),
    ('pratya.nu@up.ac.th',      'Pratya Nuankaew๛',              'ปรัชญา นวนแก้ว',              'Digital Business', 'ผู้ช่วยศาสตราจารย์', '5nYO_-cAAAAJ'),
    ('thanapon.th@up.ac.th',    'Thanapon Thiradathanaphatdecha','ธนภณ ถิรดาธนภัทรเดชา',        'Digital Business', 'อาจารย์', NULL),
    ('surinthip.sa@up.ac.th',   'Surinthip Sakphuowadol',       'สุรินทร์ทิพ ศักดิ์ภูวดล',        'Digital Business', 'อาจารย์', NULL),
    ('sudarat.ar@up.ac.th',     'Sudarat Aht-harn',             'สุดารัตน์ อาจหาญ',             'Digital Business', 'อาจารย์', NULL),
    ('pipatpong.sa@up.ac.th',   'Pipatpong Sae-phu',            'พิพัฒน์พงษ์ แซ่พู่',            'Digital Business', 'อาจารย์', NULL),

    -- --------------------------------------------------------------------------
    -- 3. สาขาวิชาเทคโนโลยีสารสนเทศ (Information Technology)
    -- --------------------------------------------------------------------------
    ('sathien.hu@up.ac.th',     'SATHIEN HUNTA',                'เสถียร หันตา',                 'Information Technology', 'ประธานหลักสูตร / อาจารย์', 'OtIA5PEAAAAJ'),
    ('rattanawadee.pa@up.ac.th','Rattanawadee Panthong',        'รัตนาวดี พานทอง',              'Information Technology', 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตร วิทยาศาสตรมหาบัณฑิต สาขาวิชาการจัดการเทคโนโลยีและข้อมูลดิจิทัล', 'szUHb4wAAAAJ'),
    ('sakkayaphop.pr@up.ac.th', 'Sakkayaphop Pravesjit',        'ศกยภพ ประเวทจิตร์',            'Information Technology', 'ผู้ช่วยศาสตราจารย์', 'mKETtsEAAAAJ'),
    ('thidapath.an@up.ac.th',   'Thidapath Anucharn',            'ธิดาภัทร อนุชาญ',              'Information Technology', 'ผู้ช่วยศาสตราจารย์', 'Cn5DYBUAAAAJ'),
    ('yeunyong.ka@up.ac.th',    'Yeunyong Kantanet',           'ยืนยง กันทะเนตร',             'Information Technology', 'อาจารย์', 'kOv6vpUAAAAJ'),
    ('sanchai.ye@up.ac.th',     'Sanchai Yeewiyom',             'สัณห์ชัย หยีวิยม',              'Information Technology', 'อาจารย์', 'PJ9aDnEAAAAJ'),
    ('nattapong.ka@up.ac.th',   'Natdanai Kamkhad',            'ณัฐดนัย คำขาด',                'Information Technology', 'อาจารย์', 'qTB5DqsAAAAJ'),
    ('rattasak.pe@up.ac.th',    'Rattasak Pengchata',         'รัตน์ธศักดิ์ เพ็งชะตา',          'Information Technology', 'อาจารย์', 'e_0l4DYAAAAJ'),
    ('thaksaorn.jo@up.ac.th',   'Thaksaorn Jommanop',           'ทักษอร จอมมานพ',              'Information Technology', 'อาจารย์', NULL),

    -- --------------------------------------------------------------------------
    -- 4. สาขาวิชาภูมิสารสนเทศศาสตร์ (Geoinformatics)
    -- --------------------------------------------------------------------------
    ('jiraporn.ko@up.ac.th',    'Jiraporn Kulsoontornrat',      'จิราพร กุลสุนทรรัตน์',          'Geoinformatics', 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตร', 'gsy7MH0AAAAJ'),
    ('nakarin.ch@up.ac.th',     'Nakarin Chaikaew',           'นครินทร์ ชัยแก้ว',              'Geoinformatics', 'ผู้ช่วยศาสตราจารย์ / รองคณบดี', 'KfBBb-UAAAAJ'),
    ('boonsiri.su@up.ac.th',    'Boonsiri Suksombat',           'บุญศิริ สุขพร้อมสรรพ์',          'Geoinformatics', 'ผู้ช่วยศาสตราจารย์', NULL),
    ('niti.ia@up.ac.th',        'Niti Iamchuen',                'นิติ เอี่ยมชื่น',                'Geoinformatics', 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตรวิทยาศาสตรมหาบัณฑิต', 'Hnbe6VkAAAAJ'),
    ('wipop.pa@up.ac.th',       'wipop paengwangthong',         'วิภพ แพงวังทอง',              'Geoinformatics', 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตรปรัชญาดุษฎีบัณฑิต', '3UtScF0AAAAJ'),
    ('phaisarn.je@up.ac.th',    'Phaisarn Jeefoo',              'ไพศาล จี้ฟู',                  'Geoinformatics', 'รองศาสตราจารย์', 'BRJXF00AAAAJ'),
    ('sawarin.le@up.ac.th',     'Sawarin Roekyusuk',            'สวรินทร์ ฤกษ์อยู่สุข',           'Geoinformatics', 'อาจารย์', NULL),
    ('chutpong.pa@up.ac.th',    'Chatchaphong Phachanaphan',    'ชัชพงศ์ ภาชนะพรรณ์',           'Geoinformatics', 'อาจารย์', NULL),

    -- --------------------------------------------------------------------------
    -- 5. สาขาวิชาวิทยาการคอมพิวเตอร์ (Computer Science)
    -- --------------------------------------------------------------------------
    ('wongpanya.nu@up.ac.th',   'Wongpanya Nuankaew, Ph.D.',           'วงษ์ปัญญา นวนแก้ว',             'Computer Science',     'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตร', 'pWRnha8AAAAJ'),
    ('surangkana.ra@up.ac.th',  'Surangkana Rawungyot,Ph.D.',    'สุรางคนา ระวังยศ',             'Computer Science',     'ผู้ช่วยศาสตราจารย์', 'ONrwXPcAAAAJ'),
    ('worrakit.sa@up.ac.th',    'worrakit sanpote',              'วรกฤต แสนโภชน์',             'Computer Science',     'อาจารย์', 'd5XfUKoAAAAJ'),
    ('thanawat.sa@up.ac.th',    'Thanawat Sae-eab',             'ธนวัฒน์ แซ่เอียบ',              'Computer Science',     'อาจารย์', NULL),
    ('kiattikul.so@up.ac.th',   'Kiattikul Suksomsathan',       'เกียรติกุล สุขสมสถาน',          'Computer Science',     'อาจารย์', NULL),
    ('thammarat.th@up.ac.th',   'Thammarat Thamma',             'ธรรมรัตน์ ธรรมา',              'Computer Science',     'อาจารย์', '-M6OQm4AAAAJ'),
    ('paweena.un@up.ac.th',     'Paweena Unlee',                'ปวีณา อุ่นลี',                 'Computer Science',     'อาจารย์', NULL),
    ('sarit.pr@up.ac.th',       'Sarit Promthep',               'ศริทธิ์ พร้อมเทพ',             'Computer Science',     'อาจารย์', NULL),
    ('sakpan.da@up.ac.th',      'Sakpan Dangmanee',             'ศักดิ์พันธุ์ แดงมณี ',            'Computer Science',     'อาจารย์', 'AeOY2nYAAAAJ'),

    -- --------------------------------------------------------------------------
    -- 6. สาขาวิชาวิทยาการข้อมูลและการประยุกต์ (Data Science and Applications)
    -- --------------------------------------------------------------------------
    ('noppadon.yo@up.ac.th',    'Noppadon Yosboonruang',        'นพดล ยศบุญเรือง',              'Data Science and Applications', 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตร', '2K_AJKUAAAAJ'),
    ('kanokwatt.sh@up.ac.th',   'KANOKWATT SHIANGJEN',          'กนกวรรธน์ เซี่ยงเจ็น',          'Data Science and Applications', 'อาจารย์', 'w2LATP4AAAAJ'),
    ('sulawan.yo@up.ac.th',     'Sulawan Yotthanoo',             'สุลาวัลย์ ยศธนู',              'Data Science and Applications', 'อาจารย์', 'oK0RgRcAAAAJ'),
    ('kemmawadee.pr@up.ac.th',  'Kemmawadee Preedalikit',       'เขมวดี ปรีดาลิขิต',            'Data Science and Applications', 'อาจารย์', 'CnkxqpgAAAAJ'),
    ('piyada.ph@up.ac.th',      'Piyada Phrueksawatnon',          'ปิยดา พฤกสวัสดิ์นนท์',         'Data Science and Applications', 'อาจารย์', 'vGckr9gAAAAJ'),
    ('satsayamon.su@up.ac.th',  'satsayamon suksaengrakcharoen','ศัสยมน สุขแสงรักษ์เจริญ',       'Data Science and Applications', 'อาจารย์', 'YgHiTT0AAAAJ'),
    ('ruttana.ri@up.ac.th',     'Rattana Prommai',              'รัตนา พรมใหม่',                'Data Science and Applications', 'อาจารย์', 'dorztZoAAAAJ'),

    -- --------------------------------------------------------------------------
    -- 7. สาขาวิชาวิศวกรรมคอมพิวเตอร์ (Computer Engineering)
    -- --------------------------------------------------------------------------
    
    ('apiwat.wi@up.ac.th',      'Apiwat Wittayarat',            'อภิวัฒน์ วิทยารัฐ',             'Computer Engineering', 'ประธานหลักสูตร / อาจารย์', NULL),
    ('pornthep.ro@up.ac.th',    'Pornthep Rojanavasu',          'พรเทพ โรจนวสุ',                'Computer Engineering', 'ผู้ช่วยศาสตราจารย์ / คณบดี', 'pGxD1nkAAAAJ'),
    ('jirabhorn.ch@up.ac.th',   'jirabhorn chaiwongsai',        'จิราพร ไชยวงศ์สาย',             'Computer Engineering', 'ผู้ช่วยศาสตราจารย์ / รองคณบดี', 'uSFP9soAAAAJ'),
    ('bowonsak.sr@up.ac.th',    'Bowonsak Srisungsitthisanti',  'บวรศักดิ์ ศรีสังสิทธิสันติ',      'Computer Engineering', 'ผู้ช่วยศาสตราจารย์ / ผู้ช่วยคณบดี / ประธานหลักสูตร', 'AOHQFg8AAAAJ'),
    ('sakorn.me@up.ac.th',      'Sakorn Mekruksavanich',        'สาคร เมฆรักษาวนิช',             'Computer Engineering', 'รองศาสตราจารย์ / ประธานหลักสูตรปรัชญาดุษฎีบัณฑิต', 'BElkl-MAAAAJ'),
    ('thana.ud@up.ac.th',       'Thana Udomsripaiboon',         'ธนา อุดมศรีไพบูลย์',             'Computer Engineering', 'ผู้ช่วยศาสตราจารย์', 'HAAwwFIAAAAJ'),
    ('wattanapong.su@up.ac.th', 'Wattanapong Suttapak',         'วัฒนพงศ์ สุทธภักดิ์',             'Computer Engineering', 'ผู้ช่วยศาสตราจารย์', 'A0mVNt4AAAAJ'),
    ('torsak.so@up.ac.th',      'Torsak Soontornphand',          'ต่อศักดิ์ สุนทรพันธุ์',            'Computer Engineering', 'อาจารย์', 'KDU_DD8AAAAJ'),
    ('narongchai.mo@up.ac.th',  'Phuwissorn Phumsaranakhom',    'ภูวิศสรณ์ ภูมิสรณคมณ์',          'Computer Engineering', 'อาจารย์', NULL),
    ('narasak.bo@up.ac.th',     'narasak boonthep',             'นราศักดิ์ บุญเทพ',              'Computer Engineering', 'อาจารย์', 'XmdKPOMAAAAJ'),
    ('khomkris.ma@up.ac.th',    'Khomkris Mathiang',            'คมกริช มาเที่ยง',               'Computer Engineering', 'อาจารย์', 'wnvJ3JcAAAAJ'),
    ('adisaya.ch@up.ac.th',     'Adisaya Charoenphol',             'อดิศยา เจริญผล (ลาศึกษาต่อ)',              'Computer Engineering', 'อาจารย์', 'iG8Tp28AAAAJ'),

    -- --------------------------------------------------------------------------
    -- 8. สาขาวิชาวิศวกรรมซอฟต์แวร์ (Software Engineering)
    -- --------------------------------------------------------------------------
    ('nattapon.ha@up.ac.th',    'Nattapon Harnsamut',            'ณัฐพล หาญสมุทร',               'Software Engineering', 'ประธานหลักสูตร / อาจารย์', '0wUVQkYAAAAJ'),
    ('davit.sa@up.ac.th',       'davit sanpote',               'ดวิษ แสนโภชน์',                'Software Engineering', 'ผู้ช่วยศาสตราจารย์', '5YhyT8AAAAAJ'),
    ('apiwat.bu@up.ac.th',      'Apiwat Budwong',               'อภิวัฒน์ บุตรวงค์',              'Software Engineering', 'อาจารย์', 'P_PFNCAAAAAJ'),
    ('sujittra.sa@up.ac.th',    'Sujittra Inmanee',             'สุจิตตรา อินมะณี',              'Software Engineering', 'อาจารย์', NULL),
    ('chaow.po@up.ac.th',       'Chaow Pokaew',                 'เชาวน์ ปอแก้ว',                'Software Engineering', 'อาจารย์', NULL),
    ('chontipan.pl@up.ac.th',   'Chontipan Plengwitthaya',      'ชลติพันธ์ เปล่งวิทยา',          'Software Engineering', 'อาจารย์', NULL),
    ('mathaya.ra@up.ac.th',     'Mathaya Ratchakhom',           'เมธยา ราชคมน์',                'Software Engineering', 'อาจารย์', NULL)

ON CONFLICT (email) DO NOTHING;