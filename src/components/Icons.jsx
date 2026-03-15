import React from 'react';

export const Ico = ({ d, size = 20, fill = "none", sw = 1.8, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export const IcHome = () => <Ico d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />;
export const IcBook = () => <Ico d={["M4 19.5A2.5 2.5 0 016.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"]} />;
export const IcHistory = () => <Ico d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const IcChart = () => <Ico d="M18 20V10M12 20V4M6 20v-6" />;
export const IcWeight = () => <Ico d="M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6a6 6 0 100 12A6 6 0 0012 6z" />;
export const IcPlus = () => <Ico d="M12 5v14M5 12h14" />;
export const IcTrash = () => <Ico d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />;
export const IcEdit = () => <Ico d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
export const IcCheck = () => <Ico d="M20 6L9 17l-5-5" />;
export const IcChevL = () => <Ico d="M15 18l-6-6 6-6" />;
export const IcClose = () => <Ico d="M18 6L6 18M6 6l12 12" />;
export const IcPlay = () => <Ico d="M5 3l14 9-14 9V3z" fill="currentColor" sw={0} />;
export const IcTimer = () => <Ico d="M12 6v6l4 2 M12 2a10 10 0 100 20A10 10 0 0012 2z" />;
export const IcCamera = () => <Ico d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z" />;
export const IcImg = () => <Ico d={["M21 15l-5-5L5 21", "M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M8.5 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"]} />;
export const IcSun = () => <Ico d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42 M12 8a4 4 0 100 8 4 4 0 000-8z" />;
export const IcMoon = () => <Ico d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />;
export const IcDownload = () => <Ico d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />;
export const IcCalc = () => <Ico d={["M5 4a2 2 0 012-2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4z", "M9 9h6M9 13h3M9 17h1"]} />;
export const IcArrowUp = (props) => <Ico {...props} d="M18 15l-6-6-6 6" />;
export const IcArrowDown = (props) => <Ico {...props} d="M6 9l6 6 6-6" />;
export const IcApple = () => <Ico d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 2V6" />;
export const IcUser = () => <Ico d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z" />;
export const IcFile = () => <Ico d={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M16 13H8M16 17H8M10 9H8"]} />;
export const IcUpload = () => <Ico d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
export const IcChat = () => <Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />;
