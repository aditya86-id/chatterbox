import React from 'react'
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react';

const App = () => {
  return (

  <header>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>


  )
}

export default App
