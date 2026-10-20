-- Garder les diapositives ouvertes lors de la consultation des ressources externes.
function Link(link)
  if link.target:match("^https?://") or link.target:match("^//") then
    link.attributes["target"] = "_blank"
    link.attributes["rel"] = "noopener noreferrer"
  end
  return link
end
