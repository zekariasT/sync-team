export interface Member {
    id: string,
    name: string,
    email: string,
    status: string,
    timezone: string,
    avatar: string | null,
    createdAt: Date,
    updatedAt: Date,
}