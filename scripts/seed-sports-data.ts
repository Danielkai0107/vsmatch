import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// Firebase 配置 - 請確保環境變數已設置
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 運動資料
const sportsData = {
  badminton: {
    id: "badminton",
    name: "羽球",
    icon: "🏸",
    modes: ["單打", "雙打"],
    rulePresets: [
      {
        id: "21_points",
        label: "21分制",
        config: {
          scoreToWin: 21,
          setsToWin: 2,
          tiebreaker: null
        }
      },
      {
        id: "15_points",
        label: "15分制",
        config: {
          scoreToWin: 15,
          setsToWin: 2,
          tiebreaker: null
        }
      }
    ]
  },
  basketball: {
    id: "basketball",
    name: "籃球",
    icon: "🏀",
    modes: ["3x3", "5x5"],
    rulePresets: [
      {
        id: "standard",
        label: "標準賽制",
        config: {
          scoreToWin: 21,
          setsToWin: 1,
          tiebreaker: null
        }
      }
    ]
  },
  volleyball: {
    id: "volleyball",
    name: "排球",
    icon: "🏐",
    modes: ["室內", "沙灘"],
    rulePresets: [
      {
        id: "standard",
        label: "標準賽制",
        config: {
          scoreToWin: 25,
          setsToWin: 3,
          tiebreaker: {
            scoreToWin: 15
          }
        }
      }
    ]
  },
  tennis: {
    id: "tennis",
    name: "網球",
    icon: "🎾",
    modes: ["單打", "雙打"],
    rulePresets: [
      {
        id: "standard",
        label: "標準賽制",
        config: {
          scoreToWin: 6,
          setsToWin: 2,
          tiebreaker: {
            scoreToWin: 7
          }
        }
      }
    ]
  }
};

// 賽制格式資料
const formatsData = {
  ko_4: {
    id: "ko_4",
    name: "4強單淘汰",
    type: "knockout",
    totalSlots: 4,
    stages: [
      {
        round: 1,
        name: "準決賽",
        matches: [
          {
            id: "r1m1",
            next: "r2m1",
            p1_source: 0,
            p2_source: 1
          },
          {
            id: "r1m2",
            next: "r2m1",
            p1_source: 2,
            p2_source: 3
          }
        ]
      },
      {
        round: 2,
        name: "決賽",
        matches: [
          {
            id: "r2m1",
            next: null
          }
        ]
      }
    ]
  },
  ko_8: {
    id: "ko_8",
    name: "8強單淘汰",
    type: "knockout",
    totalSlots: 8,
    stages: [
      {
        round: 1,
        name: "第一輪",
        matches: [
          {
            id: "r1m1",
            next: "r2m1",
            p1_source: 0,
            p2_source: 1
          },
          {
            id: "r1m2",
            next: "r2m1",
            p1_source: 2,
            p2_source: 3
          },
          {
            id: "r1m3",
            next: "r2m2",
            p1_source: 4,
            p2_source: 5
          },
          {
            id: "r1m4",
            next: "r2m2",
            p1_source: 6,
            p2_source: 7
          }
        ]
      },
      {
        round: 2,
        name: "準決賽",
        matches: [
          {
            id: "r2m1",
            next: "r3m1"
          },
          {
            id: "r2m2",
            next: "r3m1"
          }
        ]
      },
      {
        round: 3,
        name: "決賽",
        matches: [
          {
            id: "r3m1",
            next: null
          }
        ]
      }
    ]
  },
  ko_16: {
    id: "ko_16",
    name: "16強單淘汰",
    type: "knockout",
    totalSlots: 16,
    stages: [
      {
        round: 1,
        name: "16強",
        matches: [
          {id: "r1m1", next: "r2m1", p1_source: 0, p2_source: 1},
          {id: "r1m2", next: "r2m1", p1_source: 2, p2_source: 3},
          {id: "r1m3", next: "r2m2", p1_source: 4, p2_source: 5},
          {id: "r1m4", next: "r2m2", p1_source: 6, p2_source: 7},
          {id: "r1m5", next: "r2m3", p1_source: 8, p2_source: 9},
          {id: "r1m6", next: "r2m3", p1_source: 10, p2_source: 11},
          {id: "r1m7", next: "r2m4", p1_source: 12, p2_source: 13},
          {id: "r1m8", next: "r2m4", p1_source: 14, p2_source: 15}
        ]
      },
      {
        round: 2,
        name: "8強",
        matches: [
          {id: "r2m1", next: "r3m1"},
          {id: "r2m2", next: "r3m1"},
          {id: "r2m3", next: "r3m2"},
          {id: "r2m4", next: "r3m2"}
        ]
      },
      {
        round: 3,
        name: "準決賽",
        matches: [
          {id: "r3m1", next: "r4m1"},
          {id: "r3m2", next: "r4m1"}
        ]
      },
      {
        round: 4,
        name: "決賽",
        matches: [
          {id: "r4m1", next: null}
        ]
      }
    ]
  }
};

async function seedSportsData() {
  console.log('開始上傳運動資料到 Firestore...');
  
  try {
    // 上傳運動資料
    for (const [sportId, sportData] of Object.entries(sportsData)) {
      console.log(`正在上傳運動: ${sportData.name} (${sportId})`);
      const sportRef = doc(db, 'sports', sportId);
      await setDoc(sportRef, sportData);
      console.log(`✓ ${sportData.name} 上傳成功`);
    }
    
    console.log('\n開始上傳賽制格式資料到 Firestore...');
    
    // 上傳賽制格式資料
    for (const [formatId, formatData] of Object.entries(formatsData)) {
      console.log(`正在上傳賽制: ${formatData.name} (${formatId})`);
      const formatRef = doc(db, 'formats', formatId);
      await setDoc(formatRef, formatData);
      console.log(`✓ ${formatData.name} 上傳成功`);
    }
    
    console.log('\n✅ 所有資料上傳完成！');
    console.log(`- 運動項目: ${Object.keys(sportsData).length} 個`);
    console.log(`- 賽制格式: ${Object.keys(formatsData).length} 個`);
    
  } catch (error) {
    console.error('❌ 上傳資料時發生錯誤:', error);
    throw error;
  }
}

// 執行腳本
seedSportsData()
  .then(() => {
    console.log('\n腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('腳本執行失敗:', error);
    process.exit(1);
  });


