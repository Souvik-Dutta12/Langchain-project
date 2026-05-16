import { MessageSquare, Clock3, EllipsisVertical, Ellipsis } from "lucide-react"
import { formatDistanceToNow } from "date-fns"


interface Props {
    title: string
    active?: boolean
    createdAt: string
    onClick: () => void
}

export default function ConversationItem({
    title,
    active,
    createdAt,
    onClick,
}: Props) {
    return (
        <button
            onClick={onClick}
            className={` w-full cursor-pointer shadow-sm text-left rounded-md p-3 transition-all border hover:bg-neutral-100 dark:hover:bg-neutral-900 
                ${active ?
                    "bg-linear-to-t from-indigo-100 to-purple-100 dark:bg-linear-to-t dark:from-indigo-900/40 dark:to-purple-900/40  border-indigo-400 dark:border-purplr-400 duration-300"
                    : "border-transparent"
                }
      `}
        >
            <div className="flex  items-center justify-between gap-2">

                <div className="flex overflow-hidden">
                    <p className="text-sm font-medium truncate">
                        {title.slice(0, 25)}
                    </p>
                </div>
                <Ellipsis />
            </div>
        </button>
    )
}