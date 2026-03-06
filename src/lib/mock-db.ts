// 内存存储 - 用于演示（无需数据库）

export interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  meetingTypeId: string;
  summary: string;
  minutes: string;
  customGoals: string[];
  customStrategies: any[];
  discussionPoints: any[];
  aiSuggestions: any[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingType {
  id: string;
  name: string;
  description: string;
  goals: string[];
  createdAt: string;
}

export interface Transcript {
  id: string;
  meetingId: string;
  speakerName: string;
  content: string;
  timestampMs: number;
  isUser: boolean;
}

// 内存存储
const meetings: Meeting[] = [
  {
    id: "demo-1",
    title: "产品需求讨论会",
    date: new Date().toISOString(),
    status: "in_progress",
    meetingTypeId: "type-1",
    summary: "",
    minutes: "",
    customGoals: ["确认需求优先级", "确定开发排期"],
    customStrategies: [],
    discussionPoints: [
      { id: "dp-1", content: "用户登录功能", status: "pending" },
      { id: "dp-2", content: "支付接口对接", status: "pending" }
    ],
    aiSuggestions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const meetingTypes: MeetingType[] = [
  {
    id: "type-1",
    name: "产品会议",
    description: "讨论产品需求和功能",
    goals: ["需求评审", "优先级排序"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "type-2",
    name: "技术评审",
    description: "技术方案讨论",
    goals: ["方案确定", "风险评估"],
    createdAt: new Date().toISOString(),
  }
];

const transcripts: Transcript[] = [
  {
    id: "t-1",
    meetingId: "demo-1",
    speakerName: "说话人0",
    content: "大家好，我们开始今天的需求讨论会。",
    timestampMs: 0,
    isUser: false,
  },
  {
    id: "t-2",
    meetingId: "demo-1",
    speakerName: "说话人1",
    content: "好的，我先介绍一下当前的用户登录功能需求。",
    timestampMs: 5000,
    isUser: false,
  },
  {
    id: "t-3",
    meetingId: "demo-1",
    speakerName: "说话人0",
    content: "登录功能需要支持手机号和微信两种方式。",
    timestampMs: 12000,
    isUser: false,
  }
];

// Mock DB 对象
export const mockDb = {
  meetings: {
    findAll: () => meetings,
    findById: (id: string) => meetings.find(m => m.id === id),
    create: (data: Partial<Meeting>) => {
      const newMeeting = {
        id: `m-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Meeting;
      meetings.push(newMeeting);
      return newMeeting;
    },
    update: (id: string, data: Partial<Meeting>) => {
      const idx = meetings.findIndex(m => m.id === id);
      if (idx >= 0) {
        meetings[idx] = { ...meetings[idx], ...data, updatedAt: new Date().toISOString() };
        return meetings[idx];
      }
      return null;
    },
  },
  meetingTypes: {
    findAll: () => meetingTypes,
    findById: (id: string) => meetingTypes.find(t => t.id === id),
  },
  transcripts: {
    findByMeetingId: (meetingId: string) => 
      transcripts.filter(t => t.meetingId === meetingId).sort((a, b) => a.timestampMs - b.timestampMs),
    create: (data: Partial<Transcript>) => {
      const newTranscript = {
        id: `t-${Date.now()}`,
        ...data,
      } as Transcript;
      transcripts.push(newTranscript);
      return newTranscript;
    },
  },
};
