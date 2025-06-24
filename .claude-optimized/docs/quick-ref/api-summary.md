# API Quick Reference

## Storage Functions
```typescript
getCases(): CaseBooking[]
saveCase(caseData: CaseBooking): void
updateCaseStatus(id: string, status: CaseStatus, user: string): void
filterCases(cases: CaseBooking[], filters: FilterOptions): CaseBooking[]
```

## Auth Functions  
```typescript
getCurrentUser(): User | null
authenticate(username: string, password: string): User | null
hasPermission(role: string, action: string): boolean
```

## Component Props (Most Used)
```typescript
interface CasesListProps {
  onProcessCase: (caseData: CaseBooking) => void;
  currentUser: User | null;
}

interface CaseCardProps {
  caseItem: CaseBooking;
  currentUser: User | null;
  onStatusChange: (id: string, status: CaseStatus) => void;
}
```

## Status Workflow
```
Case Booked → Order Preparation → Order Prepared → 
Pending Delivery (Hospital) → Delivered (Hospital) → 
Case Completed → Delivered (Office) → To be billed
```
