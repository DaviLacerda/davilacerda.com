import { Github, Instagram, Linkedin, Mail } from "lucide-react";

type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons = {
    Github: (props: IconProps) => <Github {...props} strokeWidth={1.5} />,
    Instagram: (props: IconProps) => <Instagram {...props} strokeWidth={1.5} />,
    Linkedin: (props: IconProps) => <Linkedin {...props} strokeWidth={1.5} />,
    Email: (props: IconProps) => <Mail {...props} strokeWidth={1.5} />,
};

export type Icon = keyof typeof Icons;
