import type { Metadata, Site, Socials } from "@types";

export const SITE: Site = {
  TITLE: "System Design Trainer",
  DESCRIPTION: "Expert guides, tips, and walkthroughs to help you master system design interviews at FAANG and top tech companies.",
  EMAIL: "hello@systemdesigntrainer.com",
  NUM_POSTS_ON_HOMEPAGE: 5,
  NUM_PROJECTS_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION: "System Design Trainer - Master system design interviews with AI-powered mock interviews.",
};

export const BLOG: Metadata = {
  TITLE: "System Design Interview Guide",
  DESCRIPTION: "Expert guides, interview tips, and problem walkthroughs to help you master system design interviews.",
};

export const PROJECTS: Metadata = {
  TITLE: "Projects",
  DESCRIPTION:
    "A collection of my projects with links to repositories and live demos.",
};

export const SOCIALS: Socials = [
  {
    NAME: "X (formerly Twitter)",
    HREF: "https://twitter.com/vitkarpov",
  },
  {
    NAME: "Website",
    HREF: "https://systemdesigntrainer.com",
  },
];
