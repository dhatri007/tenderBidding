# Prompt Strategy – AI Tender Automation System

## Overview
This project uses a structured, task-oriented prompt strategy to automate B2B RFP (Request for Proposal) and tender processing for FMCG enterprises such as Asian Paints.  
Instead of relying on a single large prompt, the system breaks the tender workflow into **multiple logical AI tasks**, each handled with a focused prompt or rule-based AI instruction.

This approach improves accuracy, explainability, and reliability — which are critical in enterprise tendering systems.

---

## Prompt Design Philosophy

The prompt strategy is based on four principles:

1. **Task Decomposition**
   - Each AI task solves one specific problem.
   - Avoids overloading a single prompt.

2. **Deterministic + AI Hybrid**
   - AI used where interpretation is needed (PDF understanding, matching).
   - Rule-based logic used where precision is critical (pricing, margin).

3. **Explainability**
   - Outputs include reasoning, scores, gaps, and probabilities.
   - Enables trust in AI decisions.

4. **Industry Adaptability**
   - Prompts are generic and not hardcoded to paints.
   - Can be reused across FMCG, construction, chemicals, etc.

---

## Prompt Stages and Responsibilities

### 1️⃣ Tender Understanding Prompt
**Purpose:** Extract meaningful information from unstructured tender PDFs.

**Input:**
- Raw text extracted from tender PDF

**AI Task:**
- Identify:
  - Product type
  - Quantity
  - Technical specifications
  - Compliance requirements
  - Delivery conditions

**Prompt Strategy:**
> “Extract structured tender requirements from the following text. Identify product category, quantity, specifications, and constraints.”

**Output:**
- Structured JSON summary of tender requirements

---

### 2️⃣ Product Matching Prompt
**Purpose:** Match tender requirements with internal product catalog.

**Input:**
- Tender requirements (structured)
- Product master data (CSV / JSON)

**AI Task:**
- Find:
  - Exact matches
  - Closest alternatives
- Assign a match score
- Highlight gaps

**Prompt Strategy:**
> “Compare tender requirements with product specifications and return the best match along with differences and a confidence score.”

**Output:**
- Ranked product matches
- Gap analysis (what needs adjustment)

---

### 3️⃣ Pricing & Margin Reasoning Prompt
**Purpose:** Recommend competitive yet profitable bid pricing.

**Input:**
- Product base price
- Logistics cost
- User-defined profit margin threshold
- Historical patterns

**AI Task:**
- Simulate multiple pricing scenarios
- Balance margin vs win probability

**Prompt Strategy:**
> “Given pricing constraints and margin thresholds, evaluate optimal bid values and predict winning likelihood.”

**Output:**
- Recommended bid price
- Alternative discount scenarios
- Expected profit

---

### 4️⃣ Win Probability Estimation Prompt
**Purpose:** Help users choose the bid with highest success probability.

**Input:**
- Bid price
- Discount percentage
- Historical success trends

**AI Task:**
- Predict likelihood of winning
- Compare multiple bid options

**Prompt Strategy:**
> “Estimate probability of winning the tender based on bid competitiveness and historical outcomes.”

**Output:**
- Win probability score
- Best bid option highlighted

---

### 5️⃣ Proposal Generation Prompt
**Purpose:** Generate a final tender response document.

**Input:**
- Selected product
- Final bid price
- Company details
- Tender summary

**AI Task:**
- Convert structured data into a professional proposal

**Prompt Strategy:**
> “Generate a formal tender proposal document including product details, pricing, and compliance summary.”

**Output:**
- Structured proposal text
- Converted into a downloadable PDF

---

## Prompt Governance & Safety

- No sensitive or private data stored
- All prompts are context-limited
- User inputs validated before AI usage
- Deterministic pricing logic prevents hallucinated values

---

## Why This Prompt Strategy Works

✔ Reduces hallucination risk  
✔ Improves explainability  
✔ Scales across industries  
✔ Aligns with enterprise AI governance  
✔ Easy to audit and enhance  

---

## Future Enhancements

- Vector embeddings for semantic matching
- Reinforcement learning from bid outcomes
- Multi-agent prompt orchestration
- Integration with enterprise LLM APIs

---

**This prompt strategy enables accurate, explainable, and scalable AI-driven tender automation.**
