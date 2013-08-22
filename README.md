joyful
======

An Implementation of the Joyful Testing Language for websites and web applications.

    ' file: /tests/google.joy
    '

    TEST SUITE "Google Test Suite"

    SET SCREENSIZE TO 800 BY 600

    TEST "Search Google.com for Testing"

    GO TO "http://www.google.com"
    CLICK "input[name=q]" AND WRITE "testing"
    CLICK "button:contains('Google Search')"
    WAIT FOR RESPONSE
    CHECK "div#search H3.r" TEXT CONTAINS "Software testing - Wikipedia, the free encyclopedia"
    TAKE SCREENSHOT
    
    GO

To execute:

    joyful > run /tests/google.joy -engine:phantom -output:xunit


Phase 1

- joyful-language: Description of the Language, Parser and Validation Tools
- joyful-phantom: Joyful compiler into PhantomJS tests

Phase 2

- joyful-online: Online Hosting and Execution of Joyful tests 
- joyful-runner: Self-Hosted Execution of Joyful tests
- joyful-designer: Web UI for designing Joyful tests

Phase 3
 
- Joyful WebDriver.Net: Joyful compiler into WebDriver.Net tests
- joyful-node: NPM package for running joyful tests
