export interface DiscussionPoint {
  id: string;
  content: string;
  status: "pending" | "mentioned";
  mentionedAt?: number;
  transcriptIds?: string[];
  summary?: string;
}

export interface AiSuggestion {
  id: string;
  type: "response" | "question" | "keypoint";
  content: string;
  timestampMs: number;
  relatedTranscriptId?: string;
}

