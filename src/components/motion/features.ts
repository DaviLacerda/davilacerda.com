import { domMax } from "motion/react";

/**
 * Motion's feature bundle (animations, gestures, exit and layout animations,
 * including the shared `layoutId` of the header tabs). Loaded after
 * hydration by <MotionProvider>, so it never blocks the first paint.
 */
export default domMax;
