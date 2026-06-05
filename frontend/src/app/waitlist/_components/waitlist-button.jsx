import { motion, useReducedMotion } from "framer-motion";

export default function WaitlistButton({ children, ...props }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      className="bg-(--shape-fill) text-white font-medium h-10 w-[134px] rounded-sm drop-shadow-[0px_1px_2px_rgba(0,0,0,0.3),0px_2px_6px_rgba(0,0,0,0.15)]"
      onClick={props.onClick}
      whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }}
      whileTap={shouldReduceMotion ? undefined : { y: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.button>
  );
}
