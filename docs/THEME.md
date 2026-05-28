# DLS Theme — Purple Orange Glass

- Purple/orange dark gradient background. 

```
  background:
    radial-gradient(circle at 15% 18%, var(--color-purple-soft), transparent 34%),
    radial-gradient(circle at 86% 18%, var(--color-accent-soft), transparent 30%),
    radial-gradient(circle at 60% 90%, rgba(255, 122, 144, 0.11), transparent 34%),
    linear-gradient(135deg, var(--color-bg-start), var(--color-bg-mid), var(--color-bg-end));
```
 - Gradient Logo :
```
.logo {
  width: 52px;
  height: 52px;
  border-radius: 17px;
  display: grid;
  place-items: center;
  background: linear-gradient(
    135deg,
    var(--color-purple),
    var(--color-accent),
    var(--color-accent-strong)
  );
  color: #211123;
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: 0.5px;
  box-shadow: 0 14px 30px rgba(255, 184, 107, 0.16);
}
```

- Login/register forms are centered with `auth-center-wrap`.
- Topbar includes a small status sector: clock + next class.
- Input typed/autofill text is forced to stay readable on dark backgrounds.
