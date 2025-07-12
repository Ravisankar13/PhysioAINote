import { db } from './db';
import { gameContent } from '@shared/schema';

/**
 * Create Lightning Diagnosis content for all 5 tournaments
 * Each tournament has unique questions across 3 rounds (Easy, Medium, Hard)
 * 15 questions per round, 45 total questions per tournament
 */

export async function createAllTournamentContent() {
  console.log('🏆 Creating Lightning Diagnosis content for all 5 tournaments...');

  // Tournament 1 Content
  const tournament1Content = {
    lightning_diagnosis: {
      rounds: [
        {
          name: "Round 1 - Easy",
          difficulty: "easy",
          time_per_question: 10,
          questions: [
            {
              case: "A 25-year-old office worker presents with gradual onset lower back pain after starting a new desk job. Pain is worse when sitting for long periods and improves with movement.",
              options: ["Mechanical low back pain", "Disc herniation", "Spinal stenosis", "Cauda equina syndrome"],
              correct_answer: "Mechanical low back pain",
              body_part: "back"
            },
            {
              case: "A 30-year-old runner complains of pain on the outside of their knee that started gradually over several weeks. Pain is worse when running downhill.",
              options: ["IT band syndrome", "Meniscus tear", "ACL injury", "Patellofemoral pain"],
              correct_answer: "IT band syndrome",
              body_part: "knee"
            },
            {
              case: "A 45-year-old tennis player reports shoulder pain that started after serving practice. Pain is located in the front of the shoulder and worsens with overhead activities.",
              options: ["Anterior shoulder impingement", "Rotator cuff tear", "Frozen shoulder", "AC joint injury"],
              correct_answer: "Anterior shoulder impingement",
              body_part: "shoulder"
            },
            {
              case: "A 22-year-old soccer player twisted their ankle during a game. There is immediate swelling and inability to bear weight.",
              options: ["Lateral ankle sprain", "Ankle fracture", "Achilles tendon rupture", "Peroneal tendonitis"],
              correct_answer: "Lateral ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 35-year-old presents with neck pain and stiffness after sleeping in an awkward position. Pain is unilateral and limits neck rotation.",
              options: ["Acute torticollis", "Cervical disc herniation", "Whiplash", "Cervical spondylosis"],
              correct_answer: "Acute torticollis",
              body_part: "neck"
            },
            {
              case: "A 28-year-old cyclist reports gradual onset pain in the front of their knee. Pain is worse when going up stairs or after sitting for long periods.",
              options: ["Patellofemoral pain syndrome", "Patellar tendonitis", "Meniscus tear", "IT band syndrome"],
              correct_answer: "Patellofemoral pain syndrome",
              body_part: "knee"
            },
            {
              case: "A 40-year-old gardener complains of elbow pain on the outside that developed gradually over weeks. Pain is worse when gripping objects.",
              options: ["Lateral epicondylitis", "Medial epicondylitis", "Elbow fracture", "Cubital tunnel syndrome"],
              correct_answer: "Lateral epicondylitis",
              body_part: "elbow"
            },
            {
              case: "A 50-year-old reports morning stiffness in their hands lasting 30 minutes. Multiple joints are swollen and tender symmetrically.",
              options: ["Rheumatoid arthritis", "Osteoarthritis", "Carpal tunnel syndrome", "De Quervain's tenosynovitis"],
              correct_answer: "Rheumatoid arthritis",
              body_part: "hand"
            },
            {
              case: "A 60-year-old presents with heel pain that is worst in the morning with first steps. Pain improves with walking but returns after rest.",
              options: ["Plantar fasciitis", "Achilles tendonitis", "Heel spur", "Stress fracture"],
              correct_answer: "Plantar fasciitis",
              body_part: "foot"
            },
            {
              case: "A 32-year-old office worker develops wrist pain and numbness in thumb, index, and middle fingers that worsens at night.",
              options: ["Carpal tunnel syndrome", "De Quervain's tenosynovitis", "Wrist sprain", "Cubital tunnel syndrome"],
              correct_answer: "Carpal tunnel syndrome",
              body_part: "wrist"
            },
            {
              case: "A 26-year-old weightlifter feels a sudden sharp pain in their lower back while deadlifting. Pain radiates down the right leg.",
              options: ["Lumbar disc herniation", "Muscle strain", "Spinal stenosis", "Sacroiliac joint dysfunction"],
              correct_answer: "Lumbar disc herniation",
              body_part: "back"
            },
            {
              case: "A 38-year-old experiences sudden onset severe headache, neck stiffness, and light sensitivity after a minor head bump.",
              options: ["Concussion", "Tension headache", "Migraine", "Cervical strain"],
              correct_answer: "Concussion",
              body_part: "head"
            },
            {
              case: "A 42-year-old reports hip pain that is worse in the morning and improves with movement. Pain is located in the groin area.",
              options: ["Hip osteoarthritis", "Hip labral tear", "Trochanteric bursitis", "Piriformis syndrome"],
              correct_answer: "Hip osteoarthritis",
              body_part: "hip"
            },
            {
              case: "A 24-year-old basketball player lands awkwardly and feels immediate knee pain with a 'pop' sound. Knee swells rapidly.",
              options: ["ACL injury", "Meniscus tear", "Patellar dislocation", "MCL injury"],
              correct_answer: "ACL injury",
              body_part: "knee"
            },
            {
              case: "A 55-year-old reports gradual onset shoulder pain and progressive difficulty reaching overhead. Night pain is common.",
              options: ["Frozen shoulder", "Rotator cuff tear", "Shoulder impingement", "AC joint arthritis"],
              correct_answer: "Frozen shoulder",
              body_part: "shoulder"
            }
          ]
        },
        {
          name: "Round 2 - Medium",
          difficulty: "medium", 
          time_per_question: 10,
          questions: [
            {
              case: "A 45-year-old presents with intermittent lower back pain and leg numbness that worsens when walking and improves when sitting or leaning forward.",
              options: ["Spinal stenosis", "Disc herniation", "Piriformis syndrome", "Sacroiliac dysfunction"],
              correct_answer: "Spinal stenosis",
              body_part: "back"
            },
            {
              case: "A 30-year-old dancer reports deep hip pain with clicking during certain movements. Pain is worse with hip flexion and internal rotation.",
              options: ["Hip labral tear", "Hip impingement", "Psoas strain", "Trochanteric bursitis"],
              correct_answer: "Hip labral tear", 
              body_part: "hip"
            },
            {
              case: "A 35-year-old rock climber develops elbow pain that worsens with wrist extension and gripping. Pain is on the lateral aspect of the elbow.",
              options: ["Lateral epicondylitis", "Posterior interosseous nerve entrapment", "Radial tunnel syndrome", "Elbow instability"],
              correct_answer: "Posterior interosseous nerve entrapment",
              body_part: "elbow"
            },
            {
              case: "A 28-year-old volleyball player has shoulder pain with overhead activities. Pain is deep and accompanied by weakness in external rotation.",
              options: ["Posterior shoulder impingement", "SLAP tear", "Rotator cuff tendinopathy", "Subacromial bursitis"],
              correct_answer: "SLAP tear",
              body_part: "shoulder"
            },
            {
              case: "A 50-year-old experiences knee pain that is worse when going down stairs. There's a grinding sensation and occasional locking.",
              options: ["Patellofemoral osteoarthritis", "Meniscus tear", "Patellar tendinopathy", "Chondromalacia patellae"],
              correct_answer: "Patellofemoral osteoarthritis",
              body_part: "knee"
            },
            {
              case: "A 40-year-old runner develops foot pain that's worse in the morning and after activity. Pain is on the medial arch.",
              options: ["Posterior tibial tendon dysfunction", "Plantar fasciitis", "Navicular stress fracture", "Tarsal tunnel syndrome"],
              correct_answer: "Posterior tibial tendon dysfunction",
              body_part: "foot"
            },
            {
              case: "A 33-year-old office worker has neck pain with arm numbness in the C6 dermatome pattern. Symptoms worsen with neck extension.",
              options: ["C5-C6 disc herniation", "Thoracic outlet syndrome", "Cervical radiculopathy C6", "Scalene syndrome"],
              correct_answer: "Cervical radiculopathy C6",
              body_part: "neck"
            },
            {
              case: "A 26-year-old swimmer develops shoulder pain during the pull phase. Pain is posterior and deep, worsening with horizontal adduction.",
              options: ["Posterior impingement", "Infraspinatus tendinopathy", "Posterior capsular tightness", "Glenoid labral tear"],
              correct_answer: "Posterior impingement",
              body_part: "shoulder"
            },
            {
              case: "A 42-year-old experiences wrist pain on the thumb side that worsens with grasping. Pain radiates up the forearm.",
              options: ["De Quervain's tenosynovitis", "Scaphoid fracture", "CMC joint arthritis", "Intersection syndrome"],
              correct_answer: "De Quervain's tenosynovitis",
              body_part: "wrist"
            },
            {
              case: "A 38-year-old cyclist has knee pain on the lateral aspect that's worse during the downstroke of pedaling.",
              options: ["IT band friction syndrome", "Lateral meniscus tear", "LCL sprain", "Biceps femoris tendinopathy"],
              correct_answer: "IT band friction syndrome",
              body_part: "knee"
            },
            {
              case: "A 29-year-old basketball player has ankle pain that persists weeks after a sprain. Pain is deep and worsens with weight bearing.",
              options: ["Osteochondral lesion", "Chronic ankle instability", "Peroneal tendon subluxation", "Anterior ankle impingement"],
              correct_answer: "Osteochondral lesion",
              body_part: "ankle"
            },
            {
              case: "A 55-year-old reports hip pain that's worse at night and when lying on the affected side. Pain is over the greater trochanter.",
              options: ["Trochanteric bursitis", "Gluteus medius tendinopathy", "IT band syndrome", "Hip abductor strain"],
              correct_answer: "Gluteus medius tendinopathy",
              body_part: "hip"
            },
            {
              case: "A 34-year-old develops lower back pain with morning stiffness lasting over an hour. Pain improves with exercise.",
              options: ["Ankylosing spondylitis", "Mechanical low back pain", "Disc degeneration", "Facet joint syndrome"],
              correct_answer: "Ankylosing spondylitis",
              body_part: "back"
            },
            {
              case: "A 31-year-old tennis player has elbow pain on the medial side that worsens with gripping and wrist flexion activities.",
              options: ["Medial epicondylitis", "Ulnar nerve entrapment", "Flexor tendon strain", "UCL injury"],
              correct_answer: "Medial epicondylitis",
              body_part: "elbow"
            },
            {
              case: "A 47-year-old experiences foot pain between the 3rd and 4th toes that feels like walking on a pebble.",
              options: ["Morton's neuroma", "Metatarsalgia", "Stress fracture", "Interdigital bursitis"],
              correct_answer: "Morton's neuroma",
              body_part: "foot"
            }
          ]
        },
        {
          name: "Round 3 - Hard",
          difficulty: "hard",
          time_per_question: 10, 
          questions: [
            {
              case: "A 22-year-old gymnast presents with insidious onset low back pain and bilateral leg symptoms. Forward flexion relieves symptoms while extension aggravates them.",
              options: ["Spondylolisthesis", "Pars interarticularis stress fracture", "Spinal stenosis", "Cauda equina syndrome"],
              correct_answer: "Pars interarticularis stress fracture",
              body_part: "back"
            },
            {
              case: "A 16-year-old dancer has hip pain with a C-sign and mechanical symptoms. Pain is worse with hip flexion and internal rotation.",
              options: ["Femoroacetabular impingement", "Hip dysplasia", "Labral tear", "Stress fracture"],
              correct_answer: "Femoroacetabular impingement",
              body_part: "hip"
            },
            {
              case: "A 28-year-old pitcher develops elbow pain with valgus stress testing positive and apprehension with late cocking phase.",
              options: ["UCL injury", "Medial epicondylitis", "Flexor pronator strain", "Ulnar nerve subluxation"],
              correct_answer: "UCL injury",
              body_part: "elbow"
            },
            {
              case: "A 35-year-old swimmer has shoulder pain with positive sulcus sign and apprehension test, but negative impingement signs.",
              options: ["Multidirectional instability", "SLAP tear", "Rotator cuff tear", "Adhesive capsulitis"],
              correct_answer: "Multidirectional instability",
              body_part: "shoulder"
            },
            {
              case: "A 19-year-old football player has knee pain with positive pivot shift and Lachman tests, but negative anterior drawer.",
              options: ["Partial ACL tear", "Complete ACL tear", "PCL injury", "Anteromedial rotatory instability"],
              correct_answer: "Partial ACL tear",
              body_part: "knee"
            },
            {
              case: "A 45-year-old runner has medial foot pain with pes planus deformity and positive single heel raise test.",
              options: ["Posterior tibial tendon dysfunction Stage II", "Plantar fasciitis", "Navicular stress fracture", "Spring ligament injury"],
              correct_answer: "Posterior tibial tendon dysfunction Stage II",
              body_part: "foot"
            },
            {
              case: "A 30-year-old has neck pain with positive Spurling's test and decreased C5 reflex following a motor vehicle accident.",
              options: ["C4-C5 disc herniation with radiculopathy", "Brachial plexus injury", "Thoracic outlet syndrome", "Cervical facet syndrome"],
              correct_answer: "C4-C5 disc herniation with radiculopathy",
              body_part: "neck"
            },
            {
              case: "A 25-year-old overhead athlete has shoulder pain with positive O'Brien's test and pain during late cocking phase.",
              options: ["Type II SLAP lesion", "Biceps tendinopathy", "Posterior impingement", "Internal impingement"],
              correct_answer: "Type II SLAP lesion",
              body_part: "shoulder"
            },
            {
              case: "A 40-year-old musician has wrist pain with positive Finkelstein's test and crepitus over the radial styloid.",
              options: ["De Quervain's tenosynovitis with stenosing component", "Intersection syndrome", "Scapholunate ligament injury", "CMC joint arthritis"],
              correct_answer: "De Quervain's tenosynovitis with stenosing component",
              body_part: "wrist"
            },
            {
              case: "A 27-year-old runner has lateral knee pain with positive Ober test and tenderness over Gerdy's tubercle.",
              options: ["IT band friction syndrome with bursal involvement", "Lateral meniscus tear", "LCL sprain", "Popliteal tendinopathy"],
              correct_answer: "IT band friction syndrome with bursal involvement",
              body_part: "knee"
            },
            {
              case: "A 32-year-old basketball player has chronic ankle instability with positive anterior drawer and talar tilt tests.",
              options: ["Chronic lateral ankle instability", "Peroneal tendon subluxation", "Osteochondral lesion", "Subtalar instability"],
              correct_answer: "Chronic lateral ankle instability",
              body_part: "ankle"
            },
            {
              case: "A 50-year-old has hip pain with positive FABER test and tenderness over posterior superior iliac spine.",
              options: ["Sacroiliac joint dysfunction", "Piriformis syndrome", "Greater trochanteric pain syndrome", "Hip osteoarthritis"],
              correct_answer: "Sacroiliac joint dysfunction",
              body_part: "hip"
            },
            {
              case: "A 24-year-old gymnast has back pain with positive stork test and palpable step-off deformity.",
              options: ["Spondylolisthesis", "Pars interarticularis fracture", "Facet joint syndrome", "Disc herniation"],
              correct_answer: "Spondylolisthesis",
              body_part: "back"
            },
            {
              case: "A 29-year-old rock climber has elbow pain with positive moving valgus stress test and medial joint line tenderness.",
              options: ["UCL injury with posteromedial impingement", "Medial epicondylitis", "Flexor carpi ulnaris strain", "Ulnar nerve entrapment"],
              correct_answer: "UCL injury with posteromedial impingement",
              body_part: "elbow"
            },
            {
              case: "A 43-year-old runner has foot pain with positive squeeze test and tenderness between 2nd and 3rd metatarsals.",
              options: ["Morton's neuroma with intermetatarsal bursitis", "Stress fracture", "Metatarsalgia", "Plantar plate tear"],
              correct_answer: "Morton's neuroma with intermetatarsal bursitis",
              body_part: "foot"
            }
          ]
        }
      ]
    }
  };

  // Insert tournament 1 content
  await db.insert(gameContent).values({
    competitionId: 107, // Tournament 1 Competition ID (already exists)
    gameType: 'lightning_diagnosis',
    content: tournament1Content
  });

  // Tournament 2 Content - Different questions
  const tournament2Content = {
    lightning_diagnosis: {
      rounds: [
        {
          name: "Round 1 - Easy",
          difficulty: "easy",
          time_per_question: 10,
          questions: [
            {
              case: "A 29-year-old marathon runner develops gradual onset shin pain that is worse during running and improves with rest.",
              options: ["Medial tibial stress syndrome", "Stress fracture", "Compartment syndrome", "Achilles tendinopathy"],
              correct_answer: "Medial tibial stress syndrome",
              body_part: "leg"
            },
            {
              case: "A 35-year-old desk worker reports neck pain and headaches that worsen throughout the workday. Pain is bilateral and tension-like.",
              options: ["Tension-type headache", "Cervicogenic headache", "Migraine", "Cluster headache"],
              correct_answer: "Cervicogenic headache",
              body_part: "neck"
            },
            {
              case: "A 42-year-old golfer experiences lower back pain that started after a particularly long golf session. Pain is central and achy.",
              options: ["Lumbar muscle strain", "Disc herniation", "Facet joint pain", "Sacroiliac dysfunction"],
              correct_answer: "Lumbar muscle strain",
              body_part: "back"
            },
            {
              case: "A 26-year-old swimmer develops shoulder pain during freestyle stroke. Pain is anterior and worsens with overhead motion.",
              options: ["Swimmer's shoulder", "Rotator cuff tear", "AC joint sprain", "Biceps tendinopathy"],
              correct_answer: "Swimmer's shoulder",
              body_part: "shoulder"
            },
            {
              case: "A 38-year-old hiker twisted their ankle on uneven terrain. Ankle is swollen and tender on the lateral side.",
              options: ["Lateral ankle sprain", "High ankle sprain", "Peroneal tendon injury", "Ankle fracture"],
              correct_answer: "Lateral ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 31-year-old carpenter reports elbow pain that developed gradually over months. Pain is on the lateral side and worsens with gripping.",
              options: ["Tennis elbow", "Golfer's elbow", "Radial tunnel syndrome", "Elbow bursitis"],
              correct_answer: "Tennis elbow",
              body_part: "elbow"
            },
            {
              case: "A 45-year-old experiences knee pain when walking up stairs. Pain is behind the kneecap and grinding sensation is present.",
              options: ["Patellofemoral pain", "Meniscus tear", "IT band syndrome", "Patellar tendinitis"],
              correct_answer: "Patellofemoral pain",
              body_part: "knee"
            },
            {
              case: "A 52-year-old gardener has wrist pain on the thumb side that worsens when lifting pots. Pain started gradually over weeks.",
              options: ["De Quervain's tendinosis", "Carpal tunnel syndrome", "Wrist arthritis", "Scaphoid fracture"],
              correct_answer: "De Quervain's tendinosis",
              body_part: "wrist"
            },
            {
              case: "A 33-year-old runner reports heel pain that is worst when getting out of bed in the morning.",
              options: ["Plantar fasciitis", "Achilles tendinitis", "Calcaneal stress fracture", "Heel pad syndrome"],
              correct_answer: "Plantar fasciitis",
              body_part: "foot"
            },
            {
              case: "A 27-year-old office worker develops numbness and tingling in their fingers that worsens at night.",
              options: ["Carpal tunnel syndrome", "Cubital tunnel syndrome", "Thoracic outlet syndrome", "Cervical radiculopathy"],
              correct_answer: "Carpal tunnel syndrome",
              body_part: "hand"
            },
            {
              case: "A 41-year-old weightlifter feels sudden pain in their upper back during a heavy lift. Pain is sharp and localized.",
              options: ["Thoracic muscle strain", "Rib fracture", "Intercostal strain", "Thoracic disc herniation"],
              correct_answer: "Thoracic muscle strain",
              body_part: "back"
            },
            {
              case: "A 36-year-old basketball player lands hard and feels immediate hip pain. Pain is in the groin area.",
              options: ["Hip flexor strain", "Hip pointer", "Labral tear", "Adductor strain"],
              correct_answer: "Hip flexor strain",
              body_part: "hip"
            },
            {
              case: "A 28-year-old volleyball player has finger pain after blocking a spike. Finger is swollen and difficult to bend.",
              options: ["Finger sprain", "Mallet finger", "Boutonniere deformity", "Finger fracture"],
              correct_answer: "Finger sprain",
              body_part: "hand"
            },
            {
              case: "A 39-year-old cyclist reports knee pain on the front that developed gradually over several rides.",
              options: ["Patellar tendinopathy", "Quadriceps strain", "IT band syndrome", "Meniscus tear"],
              correct_answer: "Patellar tendinopathy",
              body_part: "knee"
            },
            {
              case: "A 44-year-old tennis player has shoulder pain that is worse at night and limits overhead serving.",
              options: ["Rotator cuff tendinopathy", "Frozen shoulder", "AC joint arthritis", "Shoulder bursitis"],
              correct_answer: "Rotator cuff tendinopathy",
              body_part: "shoulder"
            }
          ]
        },
        {
          name: "Round 2 - Medium",
          difficulty: "medium",
          time_per_question: 10,
          questions: [
            {
              case: "A 32-year-old runner develops leg pain during exercise that is relieved by rest and elevation. Pain is cramping in nature.",
              options: ["Chronic exertional compartment syndrome", "Stress fracture", "Shin splints", "Muscle strain"],
              correct_answer: "Chronic exertional compartment syndrome",
              body_part: "leg"
            },
            {
              case: "A 28-year-old office worker has neck pain with arm numbness following a specific dermatome pattern down to the thumb.",
              options: ["C6 radiculopathy", "Thoracic outlet syndrome", "Carpal tunnel syndrome", "Pronator teres syndrome"],
              correct_answer: "C6 radiculopathy", 
              body_part: "neck"
            },
            {
              case: "A 46-year-old presents with back pain and leg symptoms that worsen with walking but improve when pushing a shopping cart.",
              options: ["Neurogenic claudication", "Vascular claudication", "Piriformis syndrome", "Disc herniation"],
              correct_answer: "Neurogenic claudication",
              body_part: "back"
            },
            {
              case: "A 24-year-old overhead athlete has shoulder pain with clicking during specific positions and weakness in external rotation.",
              options: ["SLAP lesion", "Bankart lesion", "Hill-Sachs lesion", "Rotator cuff tear"],
              correct_answer: "SLAP lesion",
              body_part: "shoulder"
            },
            {
              case: "A 35-year-old soccer player has persistent ankle pain and instability weeks after an initial sprain.",
              options: ["Chronic ankle instability", "Osteochondral defect", "Peroneal tendon tear", "High ankle sprain"],
              correct_answer: "Chronic ankle instability",
              body_part: "ankle"
            },
            {
              case: "A 29-year-old baseball pitcher has elbow pain during the acceleration phase with medial joint opening.",
              options: ["UCL sprain", "Medial epicondylitis", "Flexor mass strain", "Ulnar neuritis"],
              correct_answer: "UCL sprain",
              body_part: "elbow"
            },
            {
              case: "A 37-year-old cyclist has knee pain that occurs at the same point in each pedal stroke with lateral knee tenderness.",
              options: ["IT band syndrome", "Lateral meniscus tear", "Patellofemoral dysfunction", "LCL injury"],
              correct_answer: "IT band syndrome",
              body_part: "knee"
            },
            {
              case: "A 43-year-old musician has wrist pain with numbness in the 4th and 5th fingers that worsens with elbow flexion.",
              options: ["Cubital tunnel syndrome", "Carpal tunnel syndrome", "Guyon's canal syndrome", "Thoracic outlet syndrome"],
              correct_answer: "Cubital tunnel syndrome",
              body_part: "wrist"
            },
            {
              case: "A 31-year-old runner has foot pain with arch collapse and difficulty with single heel rise test.",
              options: ["Posterior tibial tendon dysfunction", "Plantar fasciitis", "Navicular stress fracture", "Lisfranc injury"],
              correct_answer: "Posterior tibial tendon dysfunction",
              body_part: "foot"
            },
            {
              case: "A 26-year-old rock climber has hand pain with triggering of the finger during gripping activities.",
              options: ["Trigger finger", "Flexor tendon injury", "Pulley rupture", "Dupuytren's contracture"],
              correct_answer: "Trigger finger",
              body_part: "hand"
            },
            {
              case: "A 38-year-old swimmer has upper back pain with rib pain that worsens with deep breathing and rotation.",
              options: ["Costochondritis", "Rib stress fracture", "Intercostal strain", "Thoracic facet syndrome"],
              correct_answer: "Costochondritis",
              body_part: "back"
            },
            {
              case: "A 33-year-old dancer has deep hip pain with mechanical symptoms and positive impingement tests.",
              options: ["Femoroacetabular impingement", "Hip labral tear", "Psoas impingement", "Trochanteric bursitis"],
              correct_answer: "Femoroacetabular impingement",
              body_part: "hip"
            },
            {
              case: "A 42-year-old guitarist has thumb pain at the base with grinding sensation and weakness with pinch grip.",
              options: ["CMC joint arthritis", "De Quervain's tenosynovitis", "Scaphoid fracture", "Intersection syndrome"],
              correct_answer: "CMC joint arthritis",
              body_part: "hand"
            },
            {
              case: "A 25-year-old basketball player has knee swelling and catching sensation with positive McMurray test.",
              options: ["Meniscus tear", "ACL injury", "Loose body", "Plica syndrome"],
              correct_answer: "Meniscus tear",
              body_part: "knee"
            },
            {
              case: "A 34-year-old swimmer has shoulder pain with positive impingement signs and weakness in abduction.",
              options: ["Subacromial impingement", "Rotator cuff tear", "AC joint dysfunction", "Biceps tendinopathy"],
              correct_answer: "Subacromial impingement",
              body_part: "shoulder"
            }
          ]
        },
        {
          name: "Round 3 - Hard",
          difficulty: "hard",
          time_per_question: 10,
          questions: [
            {
              case: "A 23-year-old runner has medial leg pain with positive bone scan showing linear uptake along the posteromedial tibia.",
              options: ["Medial tibial stress reaction", "Tibial stress fracture", "Posterior compartment syndrome", "Soleus strain"],
              correct_answer: "Medial tibial stress reaction",
              body_part: "leg"
            },
            {
              case: "A 27-year-old has neck pain with positive Spurling's test, decreased triceps reflex, and C7 dermatomal symptoms.",
              options: ["C6-C7 disc herniation", "Thoracic outlet syndrome", "Double crush syndrome", "Cervical myelopathy"],
              correct_answer: "C6-C7 disc herniation",
              body_part: "neck"
            },
            {
              case: "A 41-year-old has back pain with positive slump test and crossed straight leg raise test.",
              options: ["Central disc herniation", "Lateral recess stenosis", "Piriformis syndrome", "Spondylolisthesis"],
              correct_answer: "Central disc herniation",
              body_part: "back"
            },
            {
              case: "A 22-year-old swimmer has shoulder pain with positive relocation test and apprehension in abduction/external rotation.",
              options: ["Anterior shoulder instability", "Posterior instability", "Multidirectional instability", "SLAP tear"],
              correct_answer: "Anterior shoulder instability",
              body_part: "shoulder"
            },
            {
              case: "A 31-year-old football player has ankle pain with positive external rotation test and proximal fibular tenderness.",
              options: ["High ankle sprain", "Lateral ankle sprain", "Fibular fracture", "Peroneal tendon subluxation"],
              correct_answer: "High ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 26-year-old pitcher has elbow pain with positive moving valgus stress test and posteromedial elbow impingement.",
              options: ["UCL injury with PMEI", "Medial epicondylitis", "Olecranon stress fracture", "Ulnar nerve subluxation"],
              correct_answer: "UCL injury with PMEI",
              body_part: "elbow"
            },
            {
              case: "A 33-year-old cyclist has knee pain with positive Noble test and tenderness over lateral femoral condyle.",
              options: ["IT band friction syndrome", "Lateral meniscus tear", "LCL injury", "Popliteus tendinopathy"],
              correct_answer: "IT band friction syndrome",
              body_part: "knee"
            },
            {
              case: "A 39-year-old violinist has wrist pain with positive Phalen's test and thenar muscle atrophy.",
              options: ["Severe carpal tunnel syndrome", "Median nerve laceration", "Pronator teres syndrome", "Anterior interosseous syndrome"],
              correct_answer: "Severe carpal tunnel syndrome",
              body_part: "wrist"
            },
            {
              case: "A 28-year-old dancer has foot pain with positive windlass test and tenderness at plantar fascia origin.",
              options: ["Proximal plantar fasciitis", "Calcaneal stress fracture", "Baxter's neuropathy", "Fat pad syndrome"],
              correct_answer: "Proximal plantar fasciitis",
              body_part: "foot"
            },
            {
              case: "A 24-year-old rock climber has hand pain with positive Finkelstein's test and crepitus over first dorsal compartment.",
              options: ["De Quervain's with stenosing tenosynovitis", "Intersection syndrome", "Scapholunate instability", "CMC arthritis"],
              correct_answer: "De Quervain's with stenosing tenosynovitis",
              body_part: "hand"
            },
            {
              case: "A 35-year-old rower has upper back pain with positive rib spring test and localized costovertebral tenderness.",
              options: ["Costovertebral joint dysfunction", "Rib stress fracture", "Intercostal neuralgia", "T4 syndrome"],
              correct_answer: "Costovertebral joint dysfunction",
              body_part: "back"
            },
            {
              case: "A 29-year-old dancer has hip pain with positive FABER test, FADIR test, and anterior hip impingement.",
              options: ["Mixed FAI (cam and pincer)", "Isolated cam impingement", "Isolated pincer impingement", "Hip dysplasia"],
              correct_answer: "Mixed FAI (cam and pincer)",
              body_part: "hip"
            },
            {
              case: "A 37-year-old pianist has thumb pain with positive grind test and subluxation at CMC joint.",
              options: ["CMC joint instability with arthritis", "Bennett fracture", "Rolando fracture", "Scaphotrapezial arthritis"],
              correct_answer: "CMC joint instability with arthritis",
              body_part: "hand"
            },
            {
              case: "A 21-year-old soccer player has knee pain with positive Lachman but negative pivot shift test.",
              options: ["Partial ACL tear", "Complete ACL with meniscal wedging", "ACL with secondary restraint intact", "Anteromedial bundle tear"],
              correct_answer: "Partial ACL tear",
              body_part: "knee"
            },
            {
              case: "A 30-year-old overhead athlete has shoulder pain with positive O'Brien's test and biceps load test.",
              options: ["Type II SLAP lesion", "Biceps tendon tear", "AC joint pathology", "Posterior labral tear"],
              correct_answer: "Type II SLAP lesion",
              body_part: "shoulder"
            }
          ]
        }
      ]
    }
  };

  // Insert tournament 2 content
  await db.insert(gameContent).values({
    competitionId: 118, // Tournament 2 Competition ID
    gameType: 'lightning_diagnosis',
    content: tournament2Content
  });

  // Tournament 3 Content - Focus on different body parts and conditions
  const tournament3Content = {
    lightning_diagnosis: {
      rounds: [
        {
          name: "Round 1 - Easy", 
          difficulty: "easy",
          time_per_question: 10,
          questions: [
            {
              case: "A 34-year-old jogger develops calf pain that came on suddenly during a morning run. Pain is sharp and localized to the medial calf.",
              options: ["Calf muscle strain", "Achilles tendinitis", "DVT", "Compartment syndrome"],
              correct_answer: "Calf muscle strain",
              body_part: "leg"
            },
            {
              case: "A 48-year-old computer programmer has headaches that worsen during long work sessions. Pain is band-like around the head.",
              options: ["Tension headache", "Migraine", "Cervicogenic headache", "Cluster headache"],
              correct_answer: "Tension headache",
              body_part: "head"
            },
            {
              case: "A 23-year-old basketball player feels their knee 'give way' during a cutting motion. Immediate swelling occurs.",
              options: ["ACL sprain", "MCL sprain", "Meniscus tear", "Patellar dislocation"],
              correct_answer: "ACL sprain",
              body_part: "knee"
            },
            {
              case: "A 37-year-old painter develops shoulder pain after painting a ceiling. Pain is worse with overhead reaching.",
              options: ["Subacromial impingement", "Rotator cuff tear", "AC joint sprain", "Frozen shoulder"],
              correct_answer: "Subacromial impingement",
              body_part: "shoulder"
            },
            {
              case: "A 29-year-old hiker steps on uneven ground and immediately has ankle pain and swelling on the outside.",
              options: ["Lateral ankle sprain", "Medial ankle sprain", "High ankle sprain", "Ankle fracture"],
              correct_answer: "Lateral ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 41-year-old secretary types for hours daily and develops forearm pain near the elbow that radiates down.",
              options: ["Lateral epicondylitis", "Carpal tunnel syndrome", "Cubital tunnel syndrome", "Radial tunnel syndrome"],
              correct_answer: "Lateral epicondylitis",
              body_part: "elbow"
            },
            {
              case: "A 32-year-old experiences lower back pain after lifting heavy boxes. Pain is central and muscle-like.",
              options: ["Lumbar strain", "Disc herniation", "Facet joint pain", "SI joint dysfunction"],
              correct_answer: "Lumbar strain",
              body_part: "back"
            },
            {
              case: "A 26-year-old develops wrist pain and swelling on the thumb side after repetitive lifting at work.",
              options: ["De Quervain's tenosynovitis", "Carpal tunnel syndrome", "Wrist sprain", "CMC arthritis"],
              correct_answer: "De Quervain's tenosynovitis",
              body_part: "wrist"
            },
            {
              case: "A 39-year-old runner develops foot pain under the heel that is worst in the morning.",
              options: ["Plantar fasciitis", "Heel spur", "Fat pad syndrome", "Achilles insertion pain"],
              correct_answer: "Plantar fasciitis",
              body_part: "foot"
            },
            {
              case: "A 45-year-old develops finger stiffness and pain in multiple joints that is worse in the morning.",
              options: ["Rheumatoid arthritis", "Osteoarthritis", "Psoriatic arthritis", "Gout"],
              correct_answer: "Rheumatoid arthritis",
              body_part: "hand"
            },
            {
              case: "A 33-year-old cyclist has buttock pain that radiates down the leg and worsens when sitting.",
              options: ["Piriformis syndrome", "Sciatica", "Hamstring strain", "SI joint dysfunction"],
              correct_answer: "Piriformis syndrome",
              body_part: "hip"
            },
            {
              case: "A 28-year-old volleyball player lands awkwardly and has immediate finger pain with inability to bend the tip.",
              options: ["Mallet finger", "Swan neck deformity", "Boutonniere deformity", "Finger fracture"],
              correct_answer: "Mallet finger",
              body_part: "hand"
            },
            {
              case: "A 51-year-old gardener has thumb pain at the base that worsens with gripping and pinching activities.",
              options: ["CMC joint arthritis", "De Quervain's tenosynovitis", "Scaphoid fracture", "Trigger thumb"],
              correct_answer: "CMC joint arthritis",
              body_part: "hand"
            },
            {
              case: "A 24-year-old soccer player has knee pain below the kneecap that worsens with jumping and running.",
              options: ["Patellar tendinopathy", "Patellofemoral pain", "Osgood-Schlatter disease", "Meniscus tear"],
              correct_answer: "Patellar tendinopathy",
              body_part: "knee"
            },
            {
              case: "A 46-year-old swimmer develops neck pain and stiffness after sleeping in an awkward position.",
              options: ["Torticollis", "Cervical strain", "Cervical disc herniation", "Whiplash"],
              correct_answer: "Torticollis",
              body_part: "neck"
            }
          ]
        },
        {
          name: "Round 2 - Medium",
          difficulty: "medium", 
          time_per_question: 10,
          questions: [
            {
              case: "A 30-year-old triathlete has calf pain that persists for weeks with deep aching and morning stiffness.",
              options: ["Achilles tendinopathy", "Posterior compartment syndrome", "Gastrocnemius strain", "DVT"],
              correct_answer: "Achilles tendinopathy",
              body_part: "leg"
            },
            {
              case: "A 25-year-old student has severe headaches with visual disturbances and nausea following a minor head injury.",
              options: ["Post-concussion syndrome", "Migraine", "Tension headache", "Cervicogenic headache"],
              correct_answer: "Post-concussion syndrome",
              body_part: "head"
            },
            {
              case: "A 31-year-old runner has knee pain with locking episodes and positive McMurray test.",
              options: ["Medial meniscus tear", "Lateral meniscus tear", "Loose body", "Plica syndrome"],
              correct_answer: "Medial meniscus tear",
              body_part: "knee"
            },
            {
              case: "A 27-year-old swimmer has shoulder pain with positive hawkins test and night pain.",
              options: ["Subacromial impingement syndrome", "Rotator cuff tendinopathy", "AC joint dysfunction", "Frozen shoulder"],
              correct_answer: "Subacromial impingement syndrome",
              body_part: "shoulder"
            },
            {
              case: "A 35-year-old dancer has recurrent ankle sprains with giving way episodes and positive talar tilt test.",
              options: ["Chronic ankle instability", "Peroneal tendon subluxation", "Osteochondral lesion", "Tarsal coalition"],
              correct_answer: "Chronic ankle instability",
              body_part: "ankle"
            },
            {
              case: "A 42-year-old golfer has elbow pain on the medial side that worsens with grip strength activities.",
              options: ["Medial epicondylitis", "UCL sprain", "Flexor-pronator strain", "Ulnar nerve entrapment"],
              correct_answer: "Medial epicondylitis",
              body_part: "elbow"
            },
            {
              case: "A 38-year-old has lower back pain with morning stiffness lasting over 1 hour that improves with activity.",
              options: ["Inflammatory back pain", "Mechanical back pain", "Disc degeneration", "Muscle strain"],
              correct_answer: "Inflammatory back pain",
              body_part: "back"
            },
            {
              case: "A 29-year-old musician has wrist pain with numbness in the ring and little fingers.",
              options: ["Ulnar nerve entrapment at Guyon's canal", "Carpal tunnel syndrome", "Cubital tunnel syndrome", "Thoracic outlet syndrome"],
              correct_answer: "Ulnar nerve entrapment at Guyon's canal",
              body_part: "wrist"
            },
            {
              case: "A 43-year-old runner has foot pain with tenderness between the 3rd and 4th toes and positive Mulder's sign.",
              options: ["Morton's neuroma", "Intermetatarsal bursitis", "Stress fracture", "Plantar plate tear"],
              correct_answer: "Morton's neuroma",
              body_part: "foot"
            },
            {
              case: "A 36-year-old rock climber has finger pain with triggering during gripping motions.",
              options: ["Trigger finger", "Flexor tendon rupture", "Pulley injury", "Joint contracture"],
              correct_answer: "Trigger finger",
              body_part: "hand"
            },
            {
              case: "A 34-year-old dancer has deep hip pain with positive FADIR test and mechanical symptoms.",
              options: ["Hip impingement", "Labral tear", "Hip dysplasia", "Psoas syndrome"],
              correct_answer: "Hip impingement",
              body_part: "hip"
            },
            {
              case: "A 40-year-old pianist has thumb pain with positive grind test and weakness with pinch grip.",
              options: ["CMC joint osteoarthritis", "De Quervain's tenosynovitis", "Scaphoid fracture", "Flexor pollicis longus injury"],
              correct_answer: "CMC joint osteoarthritis",
              body_part: "hand"
            },
            {
              case: "A 26-year-old soccer player has knee instability with positive pivot shift test.",
              options: ["ACL deficiency", "PCL injury", "MCL injury", "Posterolateral corner injury"],
              correct_answer: "ACL deficiency",
              body_part: "knee"
            },
            {
              case: "A 32-year-old swimmer has shoulder pain with positive O'Brien's test and catching sensation.",
              options: ["SLAP tear", "Biceps tendon pathology", "AC joint injury", "Posterior labral tear"],
              correct_answer: "SLAP tear",
              body_part: "shoulder"
            },
            {
              case: "A 28-year-old has persistent neck pain with arm symptoms in the C7 dermatome pattern.",
              options: ["C6-C7 disc herniation", "Thoracic outlet syndrome", "Brachial plexus injury", "Double crush syndrome"],
              correct_answer: "C6-C7 disc herniation",
              body_part: "neck"
            }
          ]
        },
        {
          name: "Round 3 - Hard",
          difficulty: "hard",
          time_per_question: 10,
          questions: [
            {
              case: "A 25-year-old runner has deep posterior leg pain with positive compartment pressure testing >30mmHg.",
              options: ["Deep posterior compartment syndrome", "Tibial stress fracture", "Achilles tendinopathy", "Popliteal artery entrapment"],
              correct_answer: "Deep posterior compartment syndrome",
              body_part: "leg"
            },
            {
              case: "A 22-year-old athlete has persistent headaches with cognitive symptoms 3 months post-concussion.",
              options: ["Post-concussion syndrome", "Second impact syndrome", "Chronic traumatic encephalopathy", "Migraine disorder"],
              correct_answer: "Post-concussion syndrome",
              body_part: "head"
            },
            {
              case: "A 28-year-old basketball player has knee pain with positive dial test at 30° and 90° flexion.",
              options: ["Posterolateral corner injury", "PCL injury", "ACL injury", "LCL injury"],
              correct_answer: "Posterolateral corner injury",
              body_part: "knee"
            },
            {
              case: "A 24-year-old swimmer has shoulder pain with positive sulcus sign and multidirectional apprehension.",
              options: ["Multidirectional instability", "Unidirectional anterior instability", "SLAP tear", "Rotator interval lesion"],
              correct_answer: "Multidirectional instability",
              body_part: "shoulder"
            },
            {
              case: "A 32-year-old soccer player has ankle pain with positive squeeze test and pain 6cm above lateral malleolus.",
              options: ["High ankle sprain", "Lateral ankle sprain", "Fibular stress fracture", "Peroneal tendon tear"],
              correct_answer: "High ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 27-year-old pitcher has elbow pain with positive milking maneuver and valgus stress testing.",
              options: ["UCL insufficiency", "Medial epicondylitis", "Flexor-pronator mass strain", "Ulnar neuritis"],
              correct_answer: "UCL insufficiency",
              body_part: "elbow"
            },
            {
              case: "A 35-year-old has back pain with positive stork test and palpable step-off at L5-S1.",
              options: ["Spondylolisthesis", "Spondylolysis", "Facet syndrome", "Disc herniation"],
              correct_answer: "Spondylolisthesis",
              body_part: "back"
            },
            {
              case: "A 31-year-old violinist has wrist pain with positive Tinel's sign over the ulnar nerve at Guyon's canal.",
              options: ["Ulnar neuropathy at Guyon's canal", "Carpal tunnel syndrome", "Cubital tunnel syndrome", "Pronator teres syndrome"],
              correct_answer: "Ulnar neuropathy at Guyon's canal",
              body_part: "wrist"
            },
            {
              case: "A 37-year-old runner has forefoot pain with positive plantar plate stress test and second toe deformity.",
              options: ["Plantar plate tear", "Morton's neuroma", "Lisfranc injury", "Stress fracture"],
              correct_answer: "Plantar plate tear",
              body_part: "foot"
            },
            {
              case: "A 29-year-old climber has finger pain with positive Finkelstein's test at the A2 pulley region.",
              options: ["A2 pulley strain", "De Quervain's tenosynovitis", "Flexor tendon rupture", "Intersection syndrome"],
              correct_answer: "A2 pulley strain",
              body_part: "hand"
            },
            {
              case: "A 26-year-old dancer has hip pain with positive posterior rim impingement test and acetabular retroversion.",
              options: ["Posterior impingement with retroversion", "Anterior impingement", "Labral tear", "Hip dysplasia"],
              correct_answer: "Posterior impingement with retroversion",
              body_part: "hip"
            },
            {
              case: "A 38-year-old guitarist has thumb pain with positive CMC grind test and basilar joint subluxation.",
              options: ["CMC joint subluxation with arthritis", "Bennett fracture-dislocation", "Scaphotrapezial arthritis", "De Quervain's tenosynovitis"],
              correct_answer: "CMC joint subluxation with arthritis",
              body_part: "hand"
            },
            {
              case: "A 23-year-old soccer player has knee pain with positive Lachman test but negative pivot shift due to meniscal wedging.",
              options: ["ACL tear with meniscal wedging", "Partial ACL tear", "ACL tear with MCL injury", "Isolated meniscal tear"],
              correct_answer: "ACL tear with meniscal wedging",
              body_part: "knee"
            },
            {
              case: "A 30-year-old overhead athlete has shoulder pain with positive biceps load test II and dynamic labral shear test.",
              options: ["Type II SLAP lesion with biceps involvement", "Biceps tendon tear", "AC joint pathology", "Rotator cuff tear"],
              correct_answer: "Type II SLAP lesion with biceps involvement",
              body_part: "shoulder"
            },
            {
              case: "A 26-year-old has neck pain with positive Spurling's test, hyperreflexia, and positive Hoffman's sign.",
              options: ["Cervical myelopathy", "Cervical radiculopathy", "Thoracic outlet syndrome", "Brachial plexus injury"],
              correct_answer: "Cervical myelopathy",
              body_part: "neck"
            }
          ]
        }
      ]
    }
  };

  // Insert tournament 3 content
  await db.insert(gameContent).values({
    competitionId: 119, // Tournament 3 Competition ID
    gameType: 'lightning_diagnosis',
    content: tournament3Content
  });

  // Tournament 4 Content - Advanced clinical scenarios
  const tournament4Content = {
    lightning_diagnosis: {
      rounds: [
        {
          name: "Round 1 - Easy",
          difficulty: "easy",
          time_per_question: 10,
          questions: [
            {
              case: "A 31-year-old weightlifter develops sudden sharp pain in the upper back during a heavy deadlift.",
              options: ["Rhomboid strain", "Rib fracture", "Thoracic disc herniation", "Intercostal strain"],
              correct_answer: "Rhomboid strain",
              body_part: "back"
            },
            {
              case: "A 27-year-old dancer has ankle pain and swelling after landing from a jump. Pain is on the lateral side.",
              options: ["Lateral ankle sprain", "Peroneal tendon injury", "Lateral malleolus fracture", "Calcaneus fracture"],
              correct_answer: "Lateral ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 44-year-old golfer has gradual onset elbow pain on the lateral side that worsens with backhand swings.",
              options: ["Tennis elbow", "Golfer's elbow", "Radial tunnel syndrome", "Posterior interosseous nerve entrapment"],
              correct_answer: "Tennis elbow",
              body_part: "elbow"
            },
            {
              case: "A 36-year-old runner develops knee pain that is worse when going downhill and after sitting.",
              options: ["Patellofemoral pain syndrome", "IT band syndrome", "Patellar tendinitis", "Meniscus tear"],
              correct_answer: "Patellofemoral pain syndrome",
              body_part: "knee"
            },
            {
              case: "A 29-year-old swimmer has shoulder pain during the catch phase of freestyle stroke.",
              options: ["Swimmer's shoulder", "Rotator cuff tear", "Biceps tendinitis", "AC joint injury"],
              correct_answer: "Swimmer's shoulder",
              body_part: "shoulder"
            },
            {
              case: "A 52-year-old develops wrist pain and numbness that is worse at night and affects the thumb side.",
              options: ["Carpal tunnel syndrome", "De Quervain's tenosynovitis", "Arthritis", "Ganglion cyst"],
              correct_answer: "Carpal tunnel syndrome",
              body_part: "wrist"
            },
            {
              case: "A 38-year-old jogger has heel pain that is worst with the first steps in the morning.",
              options: ["Plantar fasciitis", "Achilles tendinitis", "Calcaneal stress fracture", "Heel pad syndrome"],
              correct_answer: "Plantar fasciitis",
              body_part: "foot"
            },
            {
              case: "A 25-year-old volleyball player has finger pain after attempting to block a spike. Finger is swollen.",
              options: ["Finger sprain", "Mallet finger", "Boxer's fracture", "PIP joint dislocation"],
              correct_answer: "Finger sprain",
              body_part: "hand"
            },
            {
              case: "A 43-year-old develops neck pain and stiffness after a long drive. Pain is unilateral.",
              options: ["Neck strain", "Cervical disc herniation", "Torticollis", "Whiplash"],
              correct_answer: "Neck strain",
              body_part: "neck"
            },
            {
              case: "A 32-year-old cyclist has buttock pain that radiates down the leg when sitting.",
              options: ["Piriformis syndrome", "Sciatica", "Hamstring strain", "Gluteal strain"],
              correct_answer: "Piriformis syndrome",
              body_part: "hip"
            },
            {
              case: "A 26-year-old rock climber develops forearm pain that worsens with gripping.",
              options: ["Lateral epicondylitis", "Flexor tendinitis", "Medial epicondylitis", "Forearm compartment syndrome"],
              correct_answer: "Lateral epicondylitis",
              body_part: "elbow"
            },
            {
              case: "A 39-year-old runner has shin pain that developed gradually over several weeks of training.",
              options: ["Medial tibial stress syndrome", "Stress fracture", "Compartment syndrome", "Muscle strain"],
              correct_answer: "Medial tibial stress syndrome",
              body_part: "leg"
            },
            {
              case: "A 35-year-old tennis player has lower back pain that started after serving practice.",
              options: ["Lumbar muscle strain", "Disc herniation", "Facet joint irritation", "SI joint dysfunction"],
              correct_answer: "Lumbar muscle strain",
              body_part: "back"
            },
            {
              case: "A 28-year-old basketball player twisted their knee and now has medial knee pain and swelling.",
              options: ["MCL sprain", "ACL injury", "Medial meniscus tear", "Pes anserine bursitis"],
              correct_answer: "MCL sprain",
              body_part: "knee"
            },
            {
              case: "A 41-year-old painter has shoulder pain that is worse when reaching overhead to paint.",
              options: ["Shoulder impingement", "Rotator cuff tear", "Frozen shoulder", "AC joint sprain"],
              correct_answer: "Shoulder impingement",
              body_part: "shoulder"
            }
          ]
        },
        {
          name: "Round 2 - Medium",
          difficulty: "medium",
          time_per_question: 10,
          questions: [
            {
              case: "A 33-year-old powerlifter has thoracic spine pain with costovertebral joint tenderness and pain with deep breathing.",
              options: ["Costovertebral joint dysfunction", "Rib stress fracture", "Intercostal muscle strain", "T4 syndrome"],
              correct_answer: "Costovertebral joint dysfunction",
              body_part: "back"
            },
            {
              case: "A 24-year-old basketball player has chronic ankle instability with recurrent sprains and positive anterior drawer test.",
              options: ["Chronic lateral ankle instability", "Peroneal tendon pathology", "Osteochondral lesion", "High ankle sprain"],
              correct_answer: "Chronic lateral ankle instability",
              body_part: "ankle"
            },
            {
              case: "A 37-year-old tennis player has elbow pain with positive valgus stress test and medial joint line tenderness.",
              options: ["UCL sprain", "Medial epicondylitis", "Flexor-pronator mass strain", "Ulnar nerve subluxation"],
              correct_answer: "UCL sprain",
              body_part: "elbow"
            },
            {
              case: "A 29-year-old cyclist has anterior knee pain with positive patellar apprehension test and J-sign tracking.",
              options: ["Patellar instability", "Patellofemoral pain syndrome", "Patellar tendinopathy", "Quadriceps weakness"],
              correct_answer: "Patellar instability",
              body_part: "knee"
            },
            {
              case: "A 31-year-old swimmer has shoulder pain with positive impingement signs and weakness in external rotation.",
              options: ["Rotator cuff tendinopathy", "Subacromial bursitis", "SLAP tear", "AC joint dysfunction"],
              correct_answer: "Rotator cuff tendinopathy",
              body_part: "shoulder"
            },
            {
              case: "A 45-year-old musician has wrist pain with positive Tinel's sign at the carpal tunnel and thenar weakness.",
              options: ["Carpal tunnel syndrome", "Guyon's canal syndrome", "Pronator teres syndrome", "Anterior interosseous syndrome"],
              correct_answer: "Carpal tunnel syndrome",
              body_part: "wrist"
            },
            {
              case: "A 34-year-old runner has midfoot pain with arch collapse and positive too-many-toes sign.",
              options: ["Posterior tibial tendon dysfunction", "Lisfranc injury", "Navicular stress fracture", "Plantar fasciitis"],
              correct_answer: "Posterior tibial tendon dysfunction",
              body_part: "foot"
            },
            {
              case: "A 27-year-old rock climber has finger pain with positive Finkelstein's test at the A2 pulley region.",
              options: ["Flexor tendon pulley injury", "De Quervain's tenosynovitis", "Collateral ligament sprain", "Trigger finger"],
              correct_answer: "Flexor tendon pulley injury",
              body_part: "hand"
            },
            {
              case: "A 40-year-old office worker has neck pain with positive Spurling's test and C6 dermatomal symptoms.",
              options: ["C5-C6 disc herniation", "Cervical facet syndrome", "Thoracic outlet syndrome", "Brachial plexus injury"],
              correct_answer: "C5-C6 disc herniation",
              body_part: "neck"
            },
            {
              case: "A 26-year-old dancer has deep hip pain with positive FADIR test and clicking sensation.",
              options: ["Hip labral tear", "Femoroacetabular impingement", "Hip flexor strain", "Trochanteric bursitis"],
              correct_answer: "Hip labral tear",
              body_part: "hip"
            },
            {
              case: "A 38-year-old golfer has elbow pain with positive lateral epicondylitis test and weakness in wrist extension.",
              options: ["Lateral epicondylitis with extensor weakness", "Radial tunnel syndrome", "Posterior interosseous nerve entrapment", "Lateral collateral ligament injury"],
              correct_answer: "Lateral epicondylitis with extensor weakness",
              body_part: "elbow"
            },
            {
              case: "A 32-year-old runner has leg pain with tight compartments and pain during exercise that resolves with rest.",
              options: ["Chronic exertional compartment syndrome", "Stress fracture", "Muscle strain", "Nerve entrapment"],
              correct_answer: "Chronic exertional compartment syndrome",
              body_part: "leg"
            },
            {
              case: "A 28-year-old weightlifter has lower back pain with positive straight leg raise test and L5 dermatomal symptoms.",
              options: ["L4-L5 disc herniation", "Piriformis syndrome", "SI joint dysfunction", "Lumbar stenosis"],
              correct_answer: "L4-L5 disc herniation",
              body_part: "back"
            },
            {
              case: "A 35-year-old soccer player has knee pain with positive McMurray test and joint line tenderness.",
              options: ["Meniscal tear", "ACL injury", "MCL sprain", "Patellofemoral dysfunction"],
              correct_answer: "Meniscal tear",
              body_part: "knee"
            },
            {
              case: "A 30-year-old overhead athlete has shoulder pain with positive relocation test and apprehension sign.",
              options: ["Anterior shoulder instability", "SLAP tear", "Rotator cuff tear", "AC joint dysfunction"],
              correct_answer: "Anterior shoulder instability",
              body_part: "shoulder"
            }
          ]
        },
        {
          name: "Round 3 - Hard",
          difficulty: "hard",
          time_per_question: 10,
          questions: [
            {
              case: "A 25-year-old gymnast has thoracic pain with positive rib spring test and costotransverse joint restriction.",
              options: ["Costotransverse joint dysfunction", "Rib stress fracture", "Intercostal neuralgia", "Thoracic disc herniation"],
              correct_answer: "Costotransverse joint dysfunction",
              body_part: "back"
            },
            {
              case: "A 22-year-old soccer player has ankle pain with positive external rotation stress test and proximal fibular tenderness.",
              options: ["High ankle sprain with syndesmotic injury", "Lateral ankle sprain", "Fibular stress fracture", "Peroneal tendon tear"],
              correct_answer: "High ankle sprain with syndesmotic injury",
              body_part: "ankle"
            },
            {
              case: "A 28-year-old pitcher has elbow pain with positive moving valgus stress test and posteromedial impingement signs.",
              options: ["UCL injury with posteromedial impingement", "Medial epicondylitis", "Olecranon stress fracture", "Flexor-pronator mass tear"],
              correct_answer: "UCL injury with posteromedial impingement",
              body_part: "elbow"
            },
            {
              case: "A 26-year-old basketball player has knee pain with positive Lachman test but negative pivot shift due to meniscal buttressing.",
              options: ["ACL tear with meniscal buttressing", "Partial ACL tear", "Combined ACL-MCL injury", "Isolated meniscal tear"],
              correct_answer: "ACL tear with meniscal buttressing",
              body_part: "knee"
            },
            {
              case: "A 24-year-old swimmer has shoulder pain with positive sulcus sign in multiple positions and generalized laxity.",
              options: ["Multidirectional shoulder instability", "Inferior capsular shift", "SLAP tear", "Rotator interval lesion"],
              correct_answer: "Multidirectional shoulder instability",
              body_part: "shoulder"
            },
            {
              case: "A 42-year-old violinist has wrist pain with positive Phalen's test and severe thenar atrophy.",
              options: ["Severe carpal tunnel syndrome with motor involvement", "Median nerve laceration", "Pronator teres syndrome", "Anterior interosseous syndrome"],
              correct_answer: "Severe carpal tunnel syndrome with motor involvement",
              body_part: "wrist"
            },
            {
              case: "A 30-year-old dancer has foot pain with positive Lisfranc stress test and midfoot instability.",
              options: ["Lisfranc ligament injury", "Navicular stress fracture", "Cuboid syndrome", "Plantar fasciitis"],
              correct_answer: "Lisfranc ligament injury",
              body_part: "foot"
            },
            {
              case: "A 25-year-old climber has finger pain with positive Finkelstein's test and palpable nodule at A1 pulley.",
              options: ["A1 pulley stenosis with trigger finger", "De Quervain's with intersection syndrome", "Flexor tendon rupture", "Collateral ligament injury"],
              correct_answer: "A1 pulley stenosis with trigger finger",
              body_part: "hand"
            },
            {
              case: "A 33-year-old has neck pain with positive Spurling's test, hyperreflexia, and positive Hoffman's sign.",
              options: ["Cervical myelopathy with cord compression", "Cervical radiculopathy", "Thoracic outlet syndrome", "Multiple sclerosis"],
              correct_answer: "Cervical myelopathy with cord compression",
              body_part: "neck"
            },
            {
              case: "A 27-year-old dancer has hip pain with positive rim impingement test and acetabular overcoverage.",
              options: ["Pincer-type femoroacetabular impingement", "Cam-type impingement", "Hip dysplasia", "Labral tear"],
              correct_answer: "Pincer-type femoroacetabular impingement",
              body_part: "hip"
            },
            {
              case: "A 34-year-old tennis player has elbow pain with positive posterolateral rotatory instability test and lateral joint gapping.",
              options: ["Lateral collateral ligament complex injury", "Lateral epicondylitis", "Radial head fracture", "Posterior interosseous nerve entrapment"],
              correct_answer: "Lateral collateral ligament complex injury",
              body_part: "elbow"
            },
            {
              case: "A 29-year-old runner has leg pain with compartment pressures >40mmHg at rest and >70mmHg post-exercise.",
              options: ["Acute compartment syndrome", "Chronic exertional compartment syndrome", "Stress fracture", "Muscle rupture"],
              correct_answer: "Acute compartment syndrome",
              body_part: "leg"
            },
            {
              case: "A 31-year-old gymnast has back pain with positive stork test and bilateral pars defects on imaging.",
              options: ["Bilateral spondylolysis", "Spondylolisthesis", "Facet syndrome", "Disc herniation"],
              correct_answer: "Bilateral spondylolysis",
              body_part: "back"
            },
            {
              case: "A 23-year-old soccer player has knee pain with positive dial test at 30° but negative at 90° flexion.",
              options: ["Isolated LCL injury", "Posterolateral corner injury", "PCL injury", "ITB injury"],
              correct_answer: "Isolated LCL injury",
              body_part: "knee"
            },
            {
              case: "A 26-year-old overhead athlete has shoulder pain with positive dynamic labral shear test and biceps load test II.",
              options: ["Type II SLAP lesion with biceps anchor involvement", "Biceps tendon tear", "Type IV SLAP lesion", "AC joint pathology"],
              correct_answer: "Type II SLAP lesion with biceps anchor involvement",
              body_part: "shoulder"
            }
          ]
        }
      ]
    }
  };

  // Insert tournament 4 content
  await db.insert(gameContent).values({
    competitionId: 120, // Tournament 4 Competition ID
    gameType: 'lightning_diagnosis',
    content: tournament4Content
  });

  // Tournament 5 Content - Specialized conditions
  const tournament5Content = {
    lightning_diagnosis: {
      rounds: [
        {
          name: "Round 1 - Easy",
          difficulty: "easy", 
          time_per_question: 10,
          questions: [
            {
              case: "A 30-year-old office worker develops gradual onset wrist pain after long typing sessions. Pain is worse at night.",
              options: ["Carpal tunnel syndrome", "De Quervain's tenosynovitis", "Wrist tendinitis", "RSI"],
              correct_answer: "Carpal tunnel syndrome",
              body_part: "wrist"
            },
            {
              case: "A 26-year-old runner has heel pain that is sharp and worst when getting out of bed in the morning.",
              options: ["Plantar fasciitis", "Achilles tendinitis", "Heel spur", "Calcaneal fracture"],
              correct_answer: "Plantar fasciitis",
              body_part: "foot"
            },
            {
              case: "A 34-year-old swimmer develops shoulder pain during freestyle that is located anteriorly.",
              options: ["Swimmer's shoulder impingement", "Rotator cuff tear", "Biceps tendinitis", "AC joint sprain"],
              correct_answer: "Swimmer's shoulder impingement",
              body_part: "shoulder"
            },
            {
              case: "A 42-year-old jogger twists their ankle while running on uneven ground. Immediate lateral pain and swelling occur.",
              options: ["Lateral ankle sprain", "High ankle sprain", "Ankle fracture", "Peroneal tendon injury"],
              correct_answer: "Lateral ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 28-year-old tennis player develops elbow pain on the outside that worsens with gripping the racket.",
              options: ["Tennis elbow", "Golfer's elbow", "Elbow bursitis", "Radial tunnel syndrome"],
              correct_answer: "Tennis elbow",
              body_part: "elbow"
            },
            {
              case: "A 37-year-old experiences knee pain behind the kneecap that worsens when going up stairs.",
              options: ["Patellofemoral pain syndrome", "Patellar tendinitis", "Meniscus tear", "Quadriceps strain"],
              correct_answer: "Patellofemoral pain syndrome",
              body_part: "knee"
            },
            {
              case: "A 45-year-old develops lower back pain after lifting heavy furniture. Pain is central and muscle-like.",
              options: ["Lumbar muscle strain", "Disc herniation", "Facet joint pain", "Sciatica"],
              correct_answer: "Lumbar muscle strain",
              body_part: "back"
            },
            {
              case: "A 31-year-old experiences neck pain and stiffness after working at a computer all day.",
              options: ["Neck muscle strain", "Cervical disc herniation", "Torticollis", "Whiplash"],
              correct_answer: "Neck muscle strain",
              body_part: "neck"
            },
            {
              case: "A 29-year-old cyclist has numbness and tingling in their fingers that is worse during long rides.",
              options: ["Handlebar palsy", "Carpal tunnel syndrome", "Thoracic outlet syndrome", "Cubital tunnel syndrome"],
              correct_answer: "Handlebar palsy",
              body_part: "hand"
            },
            {
              case: "A 33-year-old basketball player feels their hip 'catch' during certain movements. Pain is deep in the groin.",
              options: ["Hip impingement", "Hip flexor strain", "Labral tear", "Groin strain"],
              correct_answer: "Hip impingement",
              body_part: "hip"
            },
            {
              case: "A 25-year-old volleyball player has finger pain after attempting to block. The fingertip droops down.",
              options: ["Mallet finger", "Swan neck deformity", "Boutonniere deformity", "Finger fracture"],
              correct_answer: "Mallet finger",
              body_part: "hand"
            },
            {
              case: "A 39-year-old runner develops shin pain that came on gradually over several weeks of training.",
              options: ["Shin splints", "Stress fracture", "Compartment syndrome", "Muscle strain"],
              correct_answer: "Shin splints",
              body_part: "leg"
            },
            {
              case: "A 41-year-old gardener has thumb pain at the base that worsens with gripping and twisting motions.",
              options: ["CMC joint arthritis", "De Quervain's tenosynovitis", "Trigger thumb", "Scaphoid fracture"],
              correct_answer: "CMC joint arthritis",
              body_part: "hand"
            },
            {
              case: "A 27-year-old soccer player has knee pain below the kneecap that is worse with jumping activities.",
              options: ["Patellar tendinopathy", "Patellofemoral pain", "Osgood-Schlatter disease", "Quadriceps strain"],
              correct_answer: "Patellar tendinopathy",
              body_part: "knee"
            },
            {
              case: "A 35-year-old painter has shoulder pain that worsens when reaching overhead to paint ceilings.",
              options: ["Shoulder impingement", "Rotator cuff tear", "Frozen shoulder", "AC joint arthritis"],
              correct_answer: "Shoulder impingement",
              body_part: "shoulder"
            }
          ]
        },
        {
          name: "Round 2 - Medium",
          difficulty: "medium",
          time_per_question: 10, 
          questions: [
            {
              case: "A 32-year-old musician has wrist pain with numbness in the 4th and 5th fingers that worsens with sustained elbow flexion.",
              options: ["Cubital tunnel syndrome", "Carpal tunnel syndrome", "Guyon's canal syndrome", "Thoracic outlet syndrome"],
              correct_answer: "Cubital tunnel syndrome",
              body_part: "wrist"
            },
            {
              case: "A 28-year-old ballet dancer has foot pain with arch collapse and positive 'too many toes' sign from behind.",
              options: ["Posterior tibial tendon dysfunction", "Plantar fasciitis", "Navicular stress fracture", "Accessory navicular syndrome"],
              correct_answer: "Posterior tibial tendon dysfunction",
              body_part: "foot"
            },
            {
              case: "A 24-year-old swimmer has shoulder pain with positive hawkins test and weakness in external rotation.",
              options: ["Subacromial impingement with rotator cuff involvement", "SLAP tear", "AC joint dysfunction", "Biceps tendinopathy"],
              correct_answer: "Subacromial impingement with rotator cuff involvement",
              body_part: "shoulder"
            },
            {
              case: "A 36-year-old soccer player has persistent ankle instability with recurrent giving way episodes.",
              options: ["Chronic lateral ankle instability", "Peroneal tendon subluxation", "Osteochondral lesion", "Tarsal coalition"],
              correct_answer: "Chronic lateral ankle instability",
              body_part: "ankle"
            },
            {
              case: "A 31-year-old rock climber has elbow pain with positive valgus stress test and ulnar nerve symptoms.",
              options: ["UCL sprain with ulnar neuritis", "Medial epicondylitis", "Cubital tunnel syndrome", "Flexor-pronator strain"],
              correct_answer: "UCL sprain with ulnar neuritis",
              body_part: "elbow"
            },
            {
              case: "A 29-year-old cyclist has knee pain with positive Ober test and tenderness over the lateral femoral condyle.",
              options: ["IT band friction syndrome", "Lateral meniscus tear", "LCL sprain", "Popliteus tendinopathy"],
              correct_answer: "IT band friction syndrome",
              body_part: "knee"
            },
            {
              case: "A 38-year-old has lower back pain with morning stiffness >1 hour that improves with exercise and worsens with rest.",
              options: ["Ankylosing spondylitis", "Mechanical low back pain", "Disc degeneration", "Facet syndrome"],
              correct_answer: "Ankylosing spondylitis",
              body_part: "back"
            },
            {
              case: "A 33-year-old office worker has neck pain with positive Spurling's test and C6 dermatomal numbness.",
              options: ["C5-C6 disc herniation with radiculopathy", "Cervical facet syndrome", "Thoracic outlet syndrome", "Scalene syndrome"],
              correct_answer: "C5-C6 disc herniation with radiculopathy",
              body_part: "neck"
            },
            {
              case: "A 26-year-old guitarist has finger pain with triggering during playing and palpable nodule in palm.",
              options: ["Trigger finger", "Dupuytren's contracture", "Flexor tendon rupture", "Pulley injury"],
              correct_answer: "Trigger finger",
              body_part: "hand"
            },
            {
              case: "A 30-year-old dancer has deep hip pain with positive FADIR test and mechanical clicking.",
              options: ["Hip labral tear", "Femoroacetabular impingement", "Psoas syndrome", "Trochanteric bursitis"],
              correct_answer: "Hip labral tear",
              body_part: "hip"
            },
            {
              case: "A 34-year-old baseball player has elbow pain with positive moving valgus stress test during throwing motion.",
              options: ["UCL insufficiency", "Medial epicondylitis", "Posteromedial impingement", "Flexor-pronator mass injury"],
              correct_answer: "UCL insufficiency",
              body_part: "elbow"
            },
            {
              case: "A 27-year-old triathlete has leg pain that worsens during exercise and is relieved by rest and elevation.",
              options: ["Chronic exertional compartment syndrome", "Stress fracture", "Muscle strain", "Nerve entrapment"],
              correct_answer: "Chronic exertional compartment syndrome",
              body_part: "leg"
            },
            {
              case: "A 35-year-old weightlifter has back pain with positive straight leg raise test and L5 nerve root symptoms.",
              options: ["L4-L5 disc herniation", "Piriformis syndrome", "Sacroiliac dysfunction", "Spinal stenosis"],
              correct_answer: "L4-L5 disc herniation",
              body_part: "back"
            },
            {
              case: "A 25-year-old basketball player has knee pain with positive McMurray test and joint line tenderness.",
              options: ["Meniscal tear", "ACL injury", "MCL sprain", "Loose body"],
              correct_answer: "Meniscal tear",
              body_part: "knee"
            },
            {
              case: "A 32-year-old overhead athlete has shoulder pain with positive O'Brien's test and biceps load test.",
              options: ["SLAP tear", "Biceps tendon pathology", "AC joint dysfunction", "Rotator cuff tear"],
              correct_answer: "SLAP tear",
              body_part: "shoulder"
            }
          ]
        },
        {
          name: "Round 3 - Hard",
          difficulty: "hard",
          time_per_question: 10,
          questions: [
            {
              case: "A 28-year-old violinist has wrist pain with positive Tinel's sign at Guyon's canal and hypothenar weakness.",
              options: ["Ulnar neuropathy at Guyon's canal", "Carpal tunnel syndrome", "Cubital tunnel syndrome", "Thoracic outlet syndrome"],
              correct_answer: "Ulnar neuropathy at Guyon's canal",
              body_part: "wrist"
            },
            {
              case: "A 25-year-old runner has forefoot pain with positive plantar plate stress test and second toe hammer toe deformity.",
              options: ["Plantar plate rupture with toe deformity", "Morton's neuroma", "Lisfranc injury", "Metatarsal stress fracture"],
              correct_answer: "Plantar plate rupture with toe deformity",
              body_part: "foot"
            },
            {
              case: "A 23-year-old swimmer has shoulder pain with positive sulcus sign and load and shift test grade 3.",
              options: ["Multidirectional shoulder instability", "Unidirectional anterior instability", "SLAP tear with instability", "Voluntary instability"],
              correct_answer: "Multidirectional shoulder instability",
              body_part: "shoulder"
            },
            {
              case: "A 29-year-old soccer player has ankle pain with positive squeeze test 6cm above lateral malleolus.",
              options: ["Syndesmotic ankle sprain", "Lateral ankle sprain", "Fibular stress fracture", "Interosseous membrane injury"],
              correct_answer: "Syndesmotic ankle sprain",
              body_part: "ankle"
            },
            {
              case: "A 26-year-old pitcher has elbow pain with positive milking maneuver and posteromedial olecranon tenderness.",
              options: ["UCL injury with posteromedial impingement", "Medial epicondylitis", "Olecranon stress fracture", "Ulnar nerve subluxation"],
              correct_answer: "UCL injury with posteromedial impingement",
              body_part: "elbow"
            },
            {
              case: "A 24-year-old soccer player has knee pain with positive Lachman test but negative pivot shift due to intact meniscus.",
              options: ["Partial ACL tear with meniscal buttressing", "Complete ACL tear", "ACL tear with MCL injury", "Isolated meniscal tear"],
              correct_answer: "Partial ACL tear with meniscal buttressing",
              body_part: "knee"
            },
            {
              case: "A 31-year-old gymnast has back pain with positive stork test and palpable step-off at L5-S1 level.",
              options: ["Isthmic spondylolisthesis", "Spondylolysis", "Facet syndrome", "Disc herniation"],
              correct_answer: "Isthmic spondylolisthesis",
              body_part: "back"
            },
            {
              case: "A 27-year-old has neck pain with positive Spurling's test, hyperreflexia, and inverted radial reflex.",
              options: ["Cervical myelopathy with C5-C6 involvement", "Cervical radiculopathy", "Thoracic outlet syndrome", "Double crush syndrome"],
              correct_answer: "Cervical myelopathy with C5-C6 involvement",
              body_part: "neck"
            },
            {
              case: "A 22-year-old climber has finger pain with positive bowstringing test and loss of FDP function.",
              options: ["A2/A3 pulley rupture with bowstringing", "Flexor tendon rupture", "Collateral ligament injury", "Volar plate injury"],
              correct_answer: "A2/A3 pulley rupture with bowstringing",
              body_part: "hand"
            },
            {
              case: "A 28-year-old dancer has hip pain with positive posterior rim impingement test and acetabular retroversion.",
              options: ["Posterior femoroacetabular impingement", "Anterior impingement", "Hip dysplasia", "Ischiofemoral impingement"],
              correct_answer: "Posterior femoroacetabular impingement",
              body_part: "hip"
            },
            {
              case: "A 30-year-old tennis player has elbow pain with positive posterolateral rotatory instability test and lateral gapping.",
              options: ["Lateral collateral ligament complex insufficiency", "Lateral epicondylitis", "Radial head fracture", "Capitellum osteochondritis"],
              correct_answer: "Lateral collateral ligament complex insufficiency",
              body_part: "elbow"
            },
            {
              case: "A 26-year-old runner has leg pain with compartment pressures >45mmHg at rest in anterior compartment.",
              options: ["Acute anterior compartment syndrome", "Chronic exertional compartment syndrome", "Anterior tibial artery entrapment", "Stress fracture"],
              correct_answer: "Acute anterior compartment syndrome",
              body_part: "leg"
            },
            {
              case: "A 32-year-old gymnast has back pain with positive stork test and bilateral pars interarticularis defects.",
              options: ["Bilateral spondylolysis", "Unilateral spondylolysis", "Spondylolisthesis", "Facet syndrome"],
              correct_answer: "Bilateral spondylolysis",
              body_part: "back"
            },
            {
              case: "A 21-year-old football player has knee pain with positive dial test at 30° and 90° with increased external rotation.",
              options: ["Posterolateral corner injury", "Isolated LCL injury", "PCL injury", "Combined ACL-PCL injury"],
              correct_answer: "Posterolateral corner injury",
              body_part: "knee"
            },
            {
              case: "A 25-year-old overhead athlete has shoulder pain with positive active compression test and dynamic labral shear.",
              options: ["Type II SLAP lesion with labral extension", "Type I SLAP lesion", "Biceps tendon tear", "Type IV SLAP lesion"],
              correct_answer: "Type II SLAP lesion with labral extension",
              body_part: "shoulder"
            }
          ]
        }
      ]
    }
  };

  // Insert tournament 5 content
  await db.insert(gameContent).values({
    competitionId: 121, // Tournament 5 Competition ID
    gameType: 'lightning_diagnosis',
    content: tournament5Content
  });

  console.log('✅ Successfully created Lightning Diagnosis content for all 5 tournaments');
}

// Execute the function
createAllTournamentContent()
  .then(() => {
    console.log('Tournament content creation completed successfully');
  })
  .catch((error) => {
    console.error('Error creating tournament content:', error);
  });