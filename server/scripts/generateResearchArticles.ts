import { db } from "../db";
import { researchArticles, bodyPartEnum, type InsertResearchArticle } from "@shared/schema";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Batch size for generating articles (to avoid rate limiting)
const BATCH_SIZE = 5;

// Function to generate research article data using the OpenAI API
async function generateArticlesForBodyPart(bodyPart: string, count: number): Promise<InsertResearchArticle[]> {
  console.log(`Generating ${count} articles for ${bodyPart}...`);
  
  // Process in batches to avoid API rate limits
  const batches = Math.ceil(count / BATCH_SIZE);
  const allArticles: InsertResearchArticle[] = [];
  
  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(BATCH_SIZE, count - i * BATCH_SIZE);
    console.log(`Processing batch ${i + 1}/${batches} (${batchSize} articles)`);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist with extensive knowledge of research literature. Create realistic, detailed research article entries for a physiotherapy database."
          },
          {
            role: "user",
            content: `Generate ${batchSize} realistic peer-reviewed research articles about ${bodyPart} physiotherapy. 
            For each article include:
            - Title (realistic academic title)
            - Authors (use real researcher naming patterns with multiple authors)
            - Journal (use realistic physiotherapy/medical journal names)
            - Publication date (within the last 5 years)
            - DOI (in standard format like 10.xxxx/xxxxx.xxxx)
            - Abstract (concise but detailed research abstract)
            - URL (realistic URL to the article)
            - Key findings (3-5 bullet points on main research findings)
            - Clinical relevance (practical applications for physiotherapists)

            Return as a JSON array. Make the articles detailed, diverse, and scientifically plausible.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      console.log("Received response from OpenAI");
      
      try {
        const result = JSON.parse(content);
        const articles = result.articles || [];
        
        // Process and format each article
        const formattedArticles = articles.map((article: any) => {
          // Format the publication date
          const pubDate = new Date(article.publicationDate);
          
          return {
            title: article.title,
            authors: article.authors,
            journal: article.journal,
            publicationDate: pubDate.toISOString(),
            doi: article.doi,
            abstract: article.abstract,
            url: article.url,
            bodyPart: bodyPart as any, // Cast to any to avoid type issues
            keyFindings: article.keyFindings,
            clinicalRelevance: article.clinicalRelevance
          };
        });
        
        allArticles.push(...formattedArticles);
      } catch (error) {
        console.error("Error parsing OpenAI response:", error);
        console.log("Raw response:", content);
      }
    } catch (error) {
      console.error(`Error generating articles for ${bodyPart} (batch ${i + 1}):`, error);
    }
    
    // Add a delay between batches to avoid rate limiting
    if (i < batches - 1) {
      console.log("Waiting 2 seconds before next batch...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return allArticles;
}

// Function to generate articles for all body parts
async function generateAllArticles() {
  // Check if we have the API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable not set!");
    process.exit(1);
  }
  
  try {
    const bodyParts = bodyPartEnum.enumValues;
    const articlesPerBodyPart = 100;
    
    for (const bodyPart of bodyParts) {
      // Check existing articles for this body part
      const existingArticles = await db.select({ count: db.fn.count() })
        .from(researchArticles)
        .where(db.eq(researchArticles.bodyPart, bodyPart));
      
      const existingCount = Number(existingArticles[0]?.count || 0);
      console.log(`${bodyPart}: ${existingCount} existing articles`);
      
      if (existingCount >= articlesPerBodyPart) {
        console.log(`Skipping ${bodyPart}: already has ${existingCount} articles`);
        continue;
      }
      
      // Generate the remaining articles needed
      const neededCount = articlesPerBodyPart - existingCount;
      
      if (neededCount > 0) {
        console.log(`Generating ${neededCount} articles for ${bodyPart}...`);
        const articles = await generateArticlesForBodyPart(bodyPart, neededCount);
        
        if (articles.length > 0) {
          console.log(`Inserting ${articles.length} articles for ${bodyPart}...`);
          
          // Insert in smaller batches to avoid database issues
          const insertBatchSize = 10;
          for (let i = 0; i < articles.length; i += insertBatchSize) {
            const batch = articles.slice(i, i + insertBatchSize);
            await db.insert(researchArticles).values(batch);
            console.log(`Inserted batch ${Math.floor(i / insertBatchSize) + 1}/${Math.ceil(articles.length / insertBatchSize)}`);
          }
        }
      }
    }
    
    console.log("Completed article generation!");
  } catch (error) {
    console.error("Error in article generation:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
generateAllArticles();