export const FEED_INTERESTS = [
  {
    id: "sports",
    label: "Sport & fitness",
    keywords: [
      "sport",
      "sports",
      "football",
      "cricket",
      "fitness",
      "खेल",
      "फुटबल",
      "क्रिकेट",
    ],
  },
  {
    id: "music",
    label: "Music & dance",
    keywords: [
      "music",
      "song",
      "songs",
      "dance",
      "concert",
      "संगीत",
      "गीत",
      "नृत्य",
    ],
  },
  {
    id: "arts",
    label: "Art & literature",
    keywords: [
      "art",
      "poetry",
      "poem",
      "literature",
      "painting",
      "book",
      "कविता",
      "साहित्य",
      "कला",
    ],
  },
  {
    id: "travel",
    label: "Travel & places",
    keywords: [
      "travel",
      "tourism",
      "holiday",
      "hiking",
      "trekking",
      "यात्रा",
      "पर्यटन",
      "भ्रमण",
    ],
  },
  {
    id: "food",
    label: "Food & cooking",
    keywords: [
      "food",
      "cooking",
      "recipe",
      "restaurant",
      "खाना",
      "पकाउने",
      "परिकार",
    ],
  },
  {
    id: "technology",
    label: "Technology",
    keywords: [
      "technology",
      "software",
      "computer",
      "coding",
      "digital",
      "प्रविधि",
      "कम्प्युटर",
    ],
  },
  {
    id: "education",
    label: "Learning & education",
    keywords: [
      "education",
      "learning",
      "school",
      "university",
      "study",
      "शिक्षा",
      "विद्यालय",
      "अध्ययन",
    ],
  },
  {
    id: "business",
    label: "Business & careers",
    keywords: [
      "business",
      "career",
      "jobs",
      "entrepreneur",
      "व्यवसाय",
      "रोजगार",
      "व्यापार",
    ],
  },
  {
    id: "community",
    label: "Community & events",
    keywords: [
      "community",
      "event",
      "festival",
      "volunteer",
      "charity",
      "समुदाय",
      "कार्यक्रम",
      "चाड",
      "समाज",
    ],
  },
  {
    id: "nature",
    label: "Nature & animals",
    keywords: [
      "nature",
      "garden",
      "wildlife",
      "animal",
      "environment",
      "प्रकृति",
      "वातावरण",
      "जनावर",
    ],
  },
  {
    id: "photography",
    label: "Photography & film",
    keywords: [
      "photography",
      "photographer",
      "cinema",
      "film",
      "movie",
      "फोटोग्राफी",
      "चलचित्र",
      "फिल्म",
    ],
  },
  {
    id: "culture",
    label: "Culture & heritage",
    keywords: [
      "culture",
      "heritage",
      "language",
      "history",
      "संस्कृति",
      "सम्पदा",
      "भाषा",
      "इतिहास",
    ],
  },
] as const;
export type FeedInterestId = (typeof FEED_INTERESTS)[number]["id"];
export type RecommendationSettings = {
  interests: FeedInterestId[];
  learnFromActivity: boolean;
};
export const DEFAULT_RECOMMENDATION_SETTINGS: RecommendationSettings = {
  interests: [],
  learnFromActivity: false,
};
export type RecommendationReason =
  | "interest"
  | "following"
  | "community"
  | "activity"
  | "recent";
export const RECOMMENDATION_REASONS: Record<RecommendationReason, string> = {
  interest: "Matches your interests",
  following: "From an account you follow",
  community: "Related to Pages or Groups you follow",
  activity: "Related to your recent reactions or comments",
  recent: "Recent community post",
};
