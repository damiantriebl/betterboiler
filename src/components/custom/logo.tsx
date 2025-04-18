import { SVGProps } from "react";

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" baseProfile="tiny" viewBox="0 0 900.46 650.89">
    <text
      fontFamily="LEMONMILK-Bold, 'LEMON MILK'"
      fontSize={226.57}
      fontWeight={700}
      transform="translate(239.45 435.23)"
      className="drop-shadow-lg"
    >
      <tspan x={0} y={0} fill="#fff">
        {"APEX"}
      </tspan>
    </text>
    <path
      className="drop-shadow-lg"
      fill="#fff"
      d="M382.59 444.01c3.21 14.69-.41 30.32-10.2 42.05l-112.66 135c-4.49 5.38-11.04 8.47-17.94 8.47h-40.1V42.23l.38-.84 104.85 232.34 7.14-15.57L200.12 5.67 4.82 436.75c-8.52 18.81-5.59 40.97 7.5 56.77 34.63 41.79 101.29 122.01 124.6 148.58 4.91 5.6 11.9 8.78 19.24 8.78h87.52c7.57 0 14.76-3.4 19.68-9.29l123.6-148.1c7.85-9.41 12.08-21.1 12.42-33.01.16-5.52-.55-11.07-2.09-16.48h-14.7Z"
    />
  </svg>
);
export default Logo;
