"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import {
  motion,
  type HTMLMotionProps,
  type ValueAnimationTransition,
} from "motion/react";
import { cn } from "@/lib/utils";

type CenterUnderlineBaseProps = {
  children: ReactNode;
  className?: string;
  transition?: ValueAnimationTransition;
  underlineHeightRatio?: number;
  underlinePaddingRatio?: number;
};

type CenterUnderlineProps =
  | (CenterUnderlineBaseProps & {
      as?: "span";
    } & Omit<HTMLMotionProps<"span">, "as" | "children" | "className">)
  | (CenterUnderlineBaseProps & {
      as: "a";
    } & Omit<HTMLMotionProps<"a">, "as" | "children" | "className">);

const CenterUnderline = ({
  children,
  as = "span",
  className,
  transition = { duration: 0.25, ease: "easeInOut" },
  underlineHeightRatio = 0.1,
  underlinePaddingRatio = 0.01,
  ...props
}: CenterUnderlineProps) => {
  const textRef = useRef<HTMLElement>(null);

  function setTextRef(node: HTMLElement | null) {
    textRef.current = node;
  }

  useEffect(() => {
    const updateUnderlineStyles = () => {
      if (!textRef.current) return;

      const fontSize = parseFloat(getComputedStyle(textRef.current).fontSize);
      textRef.current.style.setProperty(
        "--underline-height",
        `${fontSize * underlineHeightRatio}px`,
      );
      textRef.current.style.setProperty(
        "--underline-padding",
        `${fontSize * underlinePaddingRatio}px`,
      );
    };

    updateUnderlineStyles();
    window.addEventListener("resize", updateUnderlineStyles);

    return () => window.removeEventListener("resize", updateUnderlineStyles);
  }, [underlineHeightRatio, underlinePaddingRatio]);

  const underlineVariants = {
    hidden: {
      width: 0,
      originX: 0.5,
    },
    visible: {
      width: "100%",
      transition,
    },
  };

  const content = (
    <>
      <span>{children}</span>
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 bg-current"
        style={{
          height: "var(--underline-height)",
          bottom: "calc(-1 * var(--underline-padding))",
        }}
        variants={underlineVariants}
        aria-hidden="true"
      />
    </>
  );

  if (as === "a") {
    return (
      <motion.a
        className={cn("relative inline-block cursor-pointer", className)}
        initial="hidden"
        animate="hidden"
        whileHover="visible"
        whileFocus="visible"
        ref={setTextRef}
        {...(props as Omit<HTMLMotionProps<"a">, "as" | "children" | "className">)}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.span
      className={cn("relative inline-block cursor-pointer", className)}
      initial="hidden"
      animate="hidden"
      whileHover="visible"
      whileFocus="visible"
      ref={setTextRef}
      {...(props as Omit<HTMLMotionProps<"span">, "as" | "children" | "className">)}
    >
      {content}
    </motion.span>
  );
};

CenterUnderline.displayName = "CenterUnderline";

export default CenterUnderline;
