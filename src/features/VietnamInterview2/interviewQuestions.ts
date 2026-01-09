// 越南旅遊險訪談問項結構
export interface InterviewSection {
  id: string;
  title: string;
  titleZh: string;
  questions: InterviewQuestion[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  subQuestions?: string[];
  conditions?: {
    if: string;
    then: string[];
  }[];
}

export const VIETNAM_INTERVIEW_SECTIONS: InterviewSection[] = [
  {
    id: 'travel_habits',
    title: 'Travel Habits',
    titleZh: '旅遊習慣',
    questions: [
      {
        id: 'travel_overview',
        question: '請概述自己的旅遊習慣與型態',
        subQuestions: [
          '旅遊地點、頻率、大概的天數和預算範圍',
          '型態（自助/半自助/跟團）',
          '旅伴（獨旅/朋友/家庭）',
          '是否有因旅遊借款的經驗'
        ]
      }
    ]
  },
  {
    id: 'insurance_awareness',
    title: 'Travel Insurance Awareness',
    titleZh: '旅遊險意識啟蒙',
    questions: [
      {
        id: 'first_purchase',
        question: '第一次買旅遊險的時候，你怎麼決定要買哪一個旅遊險方案的？請概述當時情境',
        subQuestions: [
          '參考資訊來源',
          '購買管道選擇＆原因',
          '目前共有多少次自行購買旅遊險的經驗（旅行社代買的情況不算）'
        ]
      }
    ]
  },
  {
    id: 'past_experience',
    title: 'Past Experience Sharing',
    titleZh: '過往經驗分享',
    questions: [
      {
        id: 'recent_purchase',
        question: '除了首次購買，通常你怎麼判斷買哪個旅遊險方案？請你以「最近一次購買」的過程為例說明，可以的話請一邊使用手機或電腦模擬當時情況',
        subQuestions: [
          '當時的旅遊類型',
          '考慮旅遊險的契機、是否購買的考量因素',
          '如何決定購買哪家旅遊險/哪個方案',
          '考量因素有哪些、最重視哪些因素，以其原因',
          '決策過程做哪些事幫助判斷、參考資訊來源，以其原因',
          '如何決定購買管道（如：官網、第三方平台等）',
          '選擇考量有哪些，以其原因',
          '過往是否有其他購買管道經驗'
        ],
        conditions: [
          {
            if: '過往有其他管道購買經驗',
            then: ['請比較優缺點並說明原因']
          },
          {
            if: '過往沒有其他管道購買經驗',
            then: ['跳過問題']
          }
        ]
      },
      {
        id: 'claim_experience',
        question: '是否經歷理賠',
        conditions: [
          {
            if: '過往有理賠經驗',
            then: ['請概述理賠過程']
          },
          {
            if: '過往沒有理賠經驗',
            then: ['跳過問題']
          }
        ]
      },
      {
        id: 'overall_feeling',
        question: '整體感受'
      },
      {
        id: 'good_bad_experience',
        question: '到目前為止，所有自行投保旅遊險的經驗中，有哪些好和不好的經驗？',
        conditions: [
          {
            if: '過往沒有多次自行購買旅遊險經驗',
            then: ['跳過問題']
          }
        ]
      }
    ]
  },
  {
    id: 'others_experience',
    title: "Others' Experience",
    titleZh: '受訪者眼中的他人經驗',
    questions: [
      {
        id: 'friends_insurance',
        question: '身邊是否有人會自行購買旅遊險？無論有沒有，請告訴我們你的觀察',
        subQuestions: [
          '他們看待旅遊險的態度'
        ],
        conditions: [
          {
            if: '他們有購買經驗',
            then: ['他們如何購買、在意的面向、心得']
          },
          {
            if: '他們沒有購買經驗',
            then: ['跳過問題']
          }
        ]
      }
    ]
  },
  {
    id: 'cathay_website',
    title: 'Cathay Website Simulation',
    titleZh: '模擬使用國泰旅遊險網站',
    questions: [
      {
        id: 'website_exploration',
        question: '假想你正考慮購買旅遊險（海外），進到了這個國泰網站，你會怎麼逛？請邊逛邊把你的想法說出來',
        subQuestions: [
          '正在看哪些資訊',
          '打算怎麼做',
          '有什麼感受',
          '過程中有任何一點困惑或不確定的地方都要說出來'
        ]
      }
    ]
  },
  {
    id: 'cathay_feedback',
    title: 'Cathay Website Feedback',
    titleZh: '國泰網站使用感想',
    questions: [
      {
        id: 'overall_website',
        question: '你對目前整體網頁的想法？',
        subQuestions: [
          '哪些地方不清楚',
          '哪些內容可能有吸引力'
        ]
      }
    ]
  },
  {
    id: 'cathay_design',
    title: 'Cathay Website Information Design',
    titleZh: '國泰網站資訊設計',
    questions: [
      {
        id: 'section_feedback',
        question: '請分享你對這些區塊內容的想法？並按照對影響購買決策的重要度排序',
        subQuestions: [
          '商品特色',
          '方案比較',
          '投保方式說明',
          '理賠說明',
          '優惠資訊'
        ]
      }
    ]
  },
  {
    id: 'cathay_entry',
    title: 'Cathay Insurance Entry Design',
    titleZh: '國泰網站投保入口設計',
    questions: [
      {
        id: 'next_step',
        question: '如果你看完覺得這家旅遊險不錯，接下來你會怎麼做？請示範操作'
      },
      {
        id: 'button_expectation',
        question: '這個按鈕，點擊後的結果跟你想像的一樣嗎？'
      },
      {
        id: 'flow_comparison',
        question: '針對試算投保流程，跟你進來國泰網頁之前的想像一樣嗎？跟你過往投保試算的經驗哪裡不同？'
      }
    ]
  },
  {
    id: 'cathay_about',
    title: 'Cathay Company Profile Design',
    titleZh: '國泰網站公司簡介設計',
    questions: [
      {
        id: 'about_need',
        question: '考慮買旅遊險時，你有哪些情況可能會需要看公司簡介？'
      },
      {
        id: 'about_feedback',
        question: '了解你對網站上「公司介紹」的想法',
        conditions: [
          {
            if: '前面有看公司介紹',
            then: [
              '針對內容的想法（清楚/不清楚的地方及原因、有吸引力的地方及原因）',
              '考慮買旅遊險時，公司簡介中有哪些資訊對你來說是重要的、重要的原因'
            ]
          },
          {
            if: '前面沒有看公司介紹',
            then: [
              '剛剛在考慮購買旅遊險時沒有查看的原因',
              '針對內容的想法（研究員主動展示內容）',
              '考慮買旅遊險時，公司簡介中有哪些資訊對你來說是重要的、重要的原因'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'cathay_other',
    title: 'Cathay Other Feedback',
    titleZh: '國泰網站其他回饋',
    questions: [
      {
        id: 'comparison_other',
        question: '國泰和你用過的他家官網相比，你覺得分別有哪些優缺點？',
        conditions: [
          {
            if: '沒用過他家官網投保',
            then: ['跳過問題']
          }
        ]
      },
      {
        id: 'suggestions',
        question: '針對國泰的網站，你還有什麼建議或想法嗎？',
        subQuestions: [
          '覺得怎樣會更清楚',
          '更有吸引力',
          '更能說服購買'
        ]
      }
    ]
  },
  {
    id: 'competitor_test',
    title: 'Competitor Platform Simulation',
    titleZh: '模擬使用他家平台',
    questions: [
      {
        id: 'competitor_overview',
        question: '除了你用過的幾家以外，請快速看一看這幾家的旅遊險網頁，跟我們簡單說說你的想法',
        subQuestions: [
          '網站1: https://www.cathay-ins.com.vn/online-insurance/travel-insurance?xtype=out',
          '網站2: https://baovietonline.com.vn/vi/product-personal/9/flexi-travel-insurance.html',
          '網站3: https://myvbi.vn/bao-hiem-du-lich-quoc-te',
          '網站4: https://www.libertyinsurance.com.vn/bao-hiem-du-lich',
          '整體想法',
          '整體優缺點（包含：操作與閱讀便利性、資訊清楚程度、資訊吸引人的點等）'
        ]
      }
    ]
  },
  {
    id: 'competitor_feedback',
    title: 'Competitor Website Feedback',
    titleZh: '他家網站使用感想',
    questions: [
      {
        id: 'competitor_sections',
        question: '請分享你對這些區塊內容的想法？和國泰比較的感想',
        subQuestions: [
          '商品特色',
          '方案比較',
          '試算投保入口（包含對入口的理解）'
        ]
      }
    ]
  },
  {
    id: 'hypothetical',
    title: 'Hypothetical Scenario',
    titleZh: '假設情境',
    questions: [
      {
        id: 'scenario_choice',
        question: '如果在購買機票平台/官網購買旅遊險時，你可以從以下方案任意選擇，你可能會怎麼挑選？',
        subQuestions: [
          '挑選哪些方案',
          '挑選理由'
        ]
      }
    ]
  }
];

// 取得總問題數
export const getTotalQuestions = (): number => {
  return VIETNAM_INTERVIEW_SECTIONS.reduce(
    (total, section) => total + section.questions.length,
    0
  );
};

// 取得特定 section 的問題
export const getQuestionsForSection = (sectionId: string): InterviewQuestion[] => {
  const section = VIETNAM_INTERVIEW_SECTIONS.find(s => s.id === sectionId);
  return section?.questions || [];
};
