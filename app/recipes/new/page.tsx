import AddRecipeForm from '@/components/AddRecipeForm'

export default function NewRecipePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Recipe</h1>
      <AddRecipeForm />
    </div>
  )
}
