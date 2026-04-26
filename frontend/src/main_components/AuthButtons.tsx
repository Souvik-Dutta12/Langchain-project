import {
    SignedIn,
    SignedOut,
    SignInButton,
    SignUpButton,
    UserButton
} from '@clerk/clerk-react'
import {Button} from "@/components/ui/button"

export default function AuthButtons() {
    return (
        <div className='flex gap-3'>
            <SignedOut>
                <SignInButton mode="modal">
                    <Button className="cursor-pointer " variant="secondary">Sign In</Button>
                </SignInButton>

                <SignUpButton mode="modal">
                    <Button className="cursor-pointer " variant="secondary">Sign Up</Button>
                </SignUpButton>
            </SignedOut>

            <SignedIn>
                {/* UserButton includes logout option by default */}
                <UserButton afterSignOutUrl="/" />
            </SignedIn>
        </div>
    )
  }