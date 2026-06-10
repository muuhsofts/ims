export interface Permission {
    id: string;
    name: string;
    guard_name: string;
    display_name: string;
    description: string | null;
}