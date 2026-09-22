svglite::svglite("ancrage-tversky-kahneman-1974.svg", width = 10.5, height = 5.8,
                 system_fonts = list(sans = "Arial"), bg = "transparent")

par(mar = c(5.2, 6.2, 1.2, 1.2), las = 1)
valeurs <- c(25, 45)
noms <- c("Roue : 10", "Roue : 65")
couleurs <- c("#3C78A8", "#D89B2B")

bp <- barplot(
  valeurs,
  names.arg = noms,
  col = couleurs,
  border = NA,
  ylim = c(0, 55),
  ylab = paste0("Estimation m", intToUtf8(233), "diane (%)"),
  cex.names = 1.25,
  cex.axis = 1.1,
  cex.lab = 1.2
)

abline(h = seq(0, 50, by = 10), col = "#D9DEE3", lwd = 1)
axis(2, at = seq(0, 50, by = 10), las = 1, cex.axis = 1.1)
text(bp, valeurs + 2.4, labels = paste0(valeurs, " %"),
     font = 2, cex = 1.25, col = "#17324D")
box(bty = "l", col = "#17324D")

dev.off()
