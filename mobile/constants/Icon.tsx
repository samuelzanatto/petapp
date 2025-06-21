import { Feather } from "@expo/vector-icons";

export const icon = {
    index: (props: any) => <Feather name='home' size={24}  {...props} />,
    explore: (props: any) => <Feather name='rss' size={24}  {...props} />,
    report: (props: any) => <Feather name='alert-triangle' size={24}  {...props} />,
    finder: (props: any) => <Feather name='compass' size={24}  {...props} />,
    profile: (props: any) => <Feather name='user' size={24}  {...props} />,
}