"use client";

import { useState } from "react";

const frameworks = [
  { label: "React.js", value: "react" },
  { label: "Vue.js", value: "vue" },
  { label: "Angular", value: "angular" },
  { label: "Svelte", value: "svelte" },
];

export default function DropDownMenu(props) {
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);

  const selectedLabel = frameworks.find((f) => f.value === selected)?.label;

  return (
    <div className="flex flex-col gap-1 w-[434px] h-[62px]">
      <div className="relative h-full">
        <button
          onClick={() => setOpen(!open)}
          className="w-full h-full flex items-center justify-between border-[0.85px] border-(--drop-down-border-color) rounded-md px-4.5 py-4 text-sm bg-white hover:bg-gray-50"
        >
          <span
            className={`text-[20.32px] ${selectedLabel ? "text-black " : "text-gray-400"}`}
          >
            {selectedLabel || props.title}
          </span>
          <span>
            <svg
              className={`transition-transform ${open ? "rotate-180" : ""}`}
              width="26"
              height="23"
              viewBox="0 0 26 23"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.9902 22.5L-0.000146806 -5.39648e-07L25.9806 1.73166e-06L12.9902 22.5Z"
                fill="#0A0A0A"
                fillOpacity="0.5"
              />
            </svg>
          </span>
        </button>

        {open && (
          <ul className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-md py-1">
            {frameworks.map((framework) => (
              <li
                key={framework.value}
                onClick={() => {
                  setSelected(framework.value);
                  setOpen(false);
                }}
                className="flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-100 cursor-pointer"
              >
                {framework.label}
                {selected === framework.value && (
                  <svg
                    className="w-4 h-4 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
