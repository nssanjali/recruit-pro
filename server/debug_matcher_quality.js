import { calculateMatchScore } from './utils/resumeMatcher.js';

const runTests = () => {
    console.log("--- DEBUGGING MATCH QUALITY ---");

    // Case 1: The "Perfect" Match (should be near 100)
    const jd1 = "We are looking for a Software Engineer with experience in React, Node.js, and MongoDB.";
    const resume1 = "I am a Software Engineer. I use React, Node.js, and MongoDB daily.";

    console.log("\nCase 1: Exact Match");
    const res1 = calculateMatchScore(jd1, resume1);
    console.log(`Score: ${res1.score} (Expected > 90)`);
    console.log(`Missing: ${res1.missingKeywords.join(', ')}`);

    // Case 2: Realistic Variations (The "Professional" Problem)
    const jd2 = "Requirements: ReactJS, NodeJS, AWS, CI/CD, TypeScript.";
    const resume2 = "Experienced with React.js, Node.js, Amazon Web Services, and Jenkins pipelines. Uses Typescript.";

    console.log("\nCase 2: Variations (Synonyms)");
    const res2 = calculateMatchScore(jd2, resume2);
    console.log(`Score: ${res2.score} (Expected > 80)`);
    console.log(`Found: ${res2.strongMatches.join(', ')}`);
    console.log(`Missing: ${res2.missingKeywords.join(', ')}`); // Likely missing all of them due to mismatch

    // Case 3: Candidate Three (Our generated one) vs a Standard JD
    const jd3 = "Senior Software Engineer. Requires JavaScript, React, Node.js, Express, MongoDB, Docker, AWS.";
    const resume3 = `
        Candidate Three
        SOFTWARE ENGINEER
        TECHNICAL SKILLS
        • Languages: JavaScript (ES6+), HTML5, CSS3, Python, Java
        • Frameworks: React, Node.js, Express, MongoDB, Redux
        • Tools: Git, Docker, AWS, Jenkins, Jira
        WORK EXPERIENCE
        Senior Developer at TechFlow. MERN stack.
    `;

    console.log("\nCase 3: Candidate Three vs Standard JD");
    const res3 = calculateMatchScore(jd3, resume3);
    console.log(`Score: ${res3.score}`);
    console.log(`Found: ${res3.strongMatches.join(', ')}`);
    console.log(`Missing: ${res3.missingKeywords.join(', ')}`);

};

runTests();
